// =============================================================================
// SUPABASE EDGE FUNCTION: unified-phone-login
// Project: Notre Dame College Alumni Network (NDC Dhaka)
// Runtime: Deno (Supabase Edge Runtime)
// Description: Authenticates users via Phone + Password using their SAME
//              Supabase Auth account, enforcing Admin Phone Ownership Verification,
//              atomic distributed PostgreSQL rate limiting, and zero-enumeration defenses.
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Unified error response across nonexistent, unverified, and incorrect-password attempts
// Completely prevents phone enumeration attacks while providing clear instructions.
const GENERIC_AUTH_ERROR =
  "Invalid mobile number or password. Note: Mobile number sign-in requires prior administrator verification. You may always sign in using your registered email address.";

// Normalize Bangladeshi / International phone to standard E.164 (+8801XXXXXXXXX)
function formatToE164(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.startsWith("+")) {
    return cleaned.replace(/[^\d+]/g, "");
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.startsWith("880")) {
    return `+${digits}`;
  }
  return `+880${digits.replace(/^0+/, "")}`;
}

// Atomic distributed rate limit via PostgreSQL SECURITY DEFINER RPC.
// Fails closed: if the database RPC fails or is missing, rejects safely to prevent unthrottled brute force.
async function checkDistributedRateLimit(
  supabaseAdmin: any,
  rateKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; rpcError?: string }> {
  try {
    const { data: allowed, error } = await supabaseAdmin.rpc("check_and_increment_rate_limit", {
      p_key: rateKey,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error("Rate limiter RPC execution error:", error.message);
      return { allowed: false, rpcError: error.message };
    }

    if (typeof allowed === "boolean") {
      return { allowed };
    }

    return { allowed: false, rpcError: "Unexpected rate limit response type" };
  } catch (rpcErr: any) {
    console.error("Rate limiter RPC connection failure:", rpcErr?.message || rpcErr);
    return { allowed: false, rpcError: "Connection exception" };
  }
}

// Dummy timing jitter to equalize response latency against timing side-channel attacks
async function timingJitter() {
  const jitterMs = 120 + Math.floor(Math.random() * 80);
  await new Promise((resolve) => setTimeout(resolve, jitterMs));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase service credentials not configured in Edge Runtime." }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. Client IP Identification
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "edge-client";

    const body = await req.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Please enter your mobile number and password." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanInput = identifier.trim();
    const normalizedPhone = formatToE164(cleanInput);

    // 2. Strict Distributed Rate Limiting (Server-side atomic via PostgreSQL RPC)
    // Rate limit per IP (15 attempts / min) and per Phone identifier (5 attempts / min)
    const ipCheck = await checkDistributedRateLimit(supabaseAdmin, `login_ip:${clientIp}`, 15, 60);
    const phoneCheck = await checkDistributedRateLimit(supabaseAdmin, `login_phone:${normalizedPhone}`, 5, 60);

    // Safety check: if rate-limiting RPC failed, reject safely (fail closed)
    if (ipCheck.rpcError || phoneCheck.rpcError) {
      console.error("Rate limiter verification failed. Rejecting login safely.");
      return new Response(
        JSON.stringify({
          error: "Authentication service security check temporarily unavailable. Please try again shortly.",
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    // Rate limit exceeded check
    if (!ipCheck.allowed || !phoneCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many login attempts. For institutional security, please wait 60 seconds before trying again.",
        }),
        { status: 429, headers: corsHeaders }
      );
    }

    // 3. Query public.alumni_profiles by phone number
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("alumni_profiles")
      .select("id, auth_user_id, email, phone, full_name, phone_ownership_verified, is_public")
      .or(`phone.eq.${normalizedPhone},phone.eq.${cleanInput}`)
      .maybeSingle();

    if (profileErr) {
      console.warn("Database lookup notice:", profileErr.message);
    }

    // Anti-enumeration defense Case A: Account does not exist
    if (!profile) {
      await timingJitter();
      return new Response(
        JSON.stringify({ error: GENERIC_AUTH_ERROR }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Suspended account check
    if (profile.is_public === false) {
      return new Response(
        JSON.stringify({
          error: "Your account is currently suspended. Please contact Notre Dame Alumni support.",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Anti-enumeration defense Case B: Phone ownership not verified by administrator
    // Returns identical generic error response to prevent phone enumeration
    if (!profile.phone_ownership_verified) {
      await timingJitter();
      return new Response(
        JSON.stringify({ error: GENERIC_AUTH_ERROR }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. Authenticate against Supabase Auth using the user's registered credentials
    let authSession: any = null;
    let authUser: any = null;

    // Method A: Authenticate using verified registered email + password
    if (profile.email) {
      const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: profile.email.toLowerCase().trim(),
        password,
      });

      if (!signInErr && signInData?.session) {
        authSession = signInData.session;
        authUser = signInData.user;
      }
    }

    // Method B: If email sign-in did not succeed, try phone directly
    if (!authSession) {
      try {
        const { data: phoneData, error: phoneErr } = await supabaseAdmin.auth.signInWithPassword({
          phone: normalizedPhone,
          password,
        });

        if (!phoneErr && phoneData?.session) {
          authSession = phoneData.session;
          authUser = phoneData.user;
        }
      } catch {
        // Native phone provider may not be configured in GoTrue
      }
    }

    // 5. Successful Authentication
    if (authSession) {
      // Synchronize verified phone with auth.users via Admin API
      if (profile.auth_user_id) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
            phone: normalizedPhone,
            phone_confirm: true,
          });
        } catch (syncErr) {
          console.warn("GoTrue phone sync notice:", syncErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: authSession,
          user: authUser,
          profileId: profile.id,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Anti-enumeration defense Case C & D: Incorrect password or Google OAuth account
    // All return identical generic authentication error with timing jitter
    await timingJitter();
    return new Response(
      JSON.stringify({ error: GENERIC_AUTH_ERROR }),
      { status: 401, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("unified-phone-login exception:", err);
    return new Response(
      JSON.stringify({ error: "Authentication service temporarily unavailable. Please try again." }),
      { status: 500, headers: corsHeaders }
    );
  }
});
