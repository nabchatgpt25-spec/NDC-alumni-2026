// =============================================================================
// SUPABASE EDGE FUNCTION: unified-phone-login
// Project: Notre Dame College Alumni Network (NDC Dhaka / Bogura)
// Live Domain: https://ndcbogura.alumniworld.xyz
// Runtime: Deno (Supabase Edge Runtime)
// Description: Authenticates alumni via Mobile Number + Password WITHOUT requiring
//              the Supabase Phone Provider, Twilio, or SMS OTP.
//
// Architecture & Security:
// 1. Accepts { identifier, password }.
// 2. Strict CORS origin validation against live domain (https://ndcbogura.alumniworld.xyz),
//    authorized subdomains, and development environments before returning CORS headers.
// 3. Complete OPTIONS preflight handling with HTTP 204 and cached preflight headers.
// 4. Normalizes Bangladesh mobile numbers (+8801XXXXXXXXX) and international formats.
// 5. Distributed atomic rate limiting via PostgreSQL RPC check_and_increment_rate_limit.
//    Fails closed if the limiter RPC fails or is unavailable.
// 6. Resolves registered mobile number to the associated alumni profile and email.
//    (Mobile number is an alternative login identifier; NOT a verified identity.
//     Admin phone verification is NOT required for sign-in).
// 7. Zero-enumeration defense: returns identical generic error response for
//    nonexistent accounts or incorrect passwords, with randomized timing jitter.
// 8. Enforces mandatory Supabase Email Confirmation per project configuration.
// 9. Authenticates using SUPABASE_ANON_KEY with signInWithPassword({ email, password }).
//    Never uses SUPABASE_SERVICE_ROLE_KEY to authenticate or bypass password checks.
// 10. Verifies that authenticated user.id strictly matches profile.auth_user_id.
// 11. Does NOT update, modify, or automatically confirm phone numbers during login.
// 12. Returns the official Supabase Auth session for client session establishment.
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Primary live production domain
const PRIMARY_LIVE_DOMAIN = "https://ndcbogura.alumniworld.xyz";

// Explicit institutional allowed domains
const ALLOWED_EXACT_ORIGINS = new Set([
  "https://ndcbogura.alumniworld.xyz",
  "https://alumniworld.xyz",
  "https://www.alumniworld.xyz",
]);

/**
 * Strictly validates the incoming Origin header against the live domain and authorized environments.
 * Returns the canonical validated origin string if authorized, or null if unauthorized.
 */
function getValidatedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Direct server-side / curl invocations without Origin header default to live domain
    return PRIMARY_LIVE_DOMAIN;
  }

  const normalized = origin.trim().replace(/\/+$/, "");

  // 1. Strict exact match for live domain & institutional roots
  if (ALLOWED_EXACT_ORIGINS.has(normalized)) {
    return normalized;
  }

  // 2. HTTPS subdomains of alumniworld.xyz
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*alumniworld\.xyz$/.test(normalized)) {
    return normalized;
  }

  // 3. Localhost development environments
  if (/^https?:\/\/localhost(:[0-9]+)?$/.test(normalized)) {
    return normalized;
  }
  if (/^https?:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(normalized)) {
    return normalized;
  }

  // 4. AI Studio preview environments / Google Cloud Run containers
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*run\.app$/.test(normalized)) {
    return normalized;
  }
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*googleusercontent\.com$/.test(normalized)) {
    return normalized;
  }

  // Unauthorized origin
  return null;
}

/**
 * Generates strict CORS headers based on Origin validation.
 * If Origin is unauthorized, Access-Control-Allow-Origin is omitted.
 */
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const validatedOrigin = getValidatedOrigin(req);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, accept, x-requested-with, prefer",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (validatedOrigin) {
    headers["Access-Control-Allow-Origin"] = validatedOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else if (!origin) {
    headers["Access-Control-Allow-Origin"] = PRIMARY_LIVE_DOMAIN;
  }

  return headers;
}

// Generic zero-enumeration error message
const GENERIC_AUTH_ERROR =
  "Invalid mobile number or incorrect password. Please check your credentials or sign in using your registered email address.";

/**
 * Normalizes Bangladeshi and International phone numbers to canonical E.164.
 * Bangladeshi Mobile Operators (11 digits):
 *   013, 017 -> Grameenphone / Skitto
 *   014, 019 -> Banglalink
 *   015      -> Teletalk
 *   016, 018 -> Robi / Airtel
 */
function normalizePhoneNumber(raw: string): { formatted: string; isValid: boolean; isBD: boolean; error?: string } {
  if (!raw || typeof raw !== "string") {
    return { formatted: "", isValid: false, isBD: false, error: "Mobile number is required." };
  }

  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (!digitsOnly) {
    return { formatted: "", isValid: false, isBD: false, error: "Mobile number must contain digits." };
  }

  // 13-digit BD format (8801XXXXXXXXX)
  if (digitsOnly.startsWith("8801") && digitsOnly.length === 13) {
    const operator = digitsOnly.charAt(4);
    if ("3456789".includes(operator)) {
      return { formatted: `+${digitsOnly}`, isValid: true, isBD: true };
    }
    return { formatted: `+${digitsOnly}`, isValid: false, isBD: true, error: "Invalid BD mobile operator prefix." };
  }

  // 11-digit BD format (01XXXXXXXXX)
  if (digitsOnly.startsWith("01") && digitsOnly.length === 11) {
    const operator = digitsOnly.charAt(2);
    if ("3456789".includes(operator)) {
      return { formatted: `+88${digitsOnly}`, isValid: true, isBD: true };
    }
    return { formatted: `+88${digitsOnly}`, isValid: false, isBD: true, error: "Invalid BD mobile operator prefix." };
  }

  // 10-digit BD format (1XXXXXXXXX, omitted leading 0)
  if (digitsOnly.startsWith("1") && digitsOnly.length === 10) {
    const operator = digitsOnly.charAt(1);
    if ("3456789".includes(operator)) {
      return { formatted: `+880${digitsOnly}`, isValid: true, isBD: true };
    }
  }

  // International with leading '+'
  if (trimmed.startsWith("+") && digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return { formatted: `+${digitsOnly}`, isValid: true, isBD: digitsOnly.startsWith("880") };
  }

  // International digits only (7 to 15 digits)
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return { formatted: `+${digitsOnly}`, isValid: true, isBD: digitsOnly.startsWith("880") };
  }

  return { formatted: trimmed, isValid: false, isBD: false, error: "Invalid phone number format." };
}

/**
 * Generate canonical phone search variants to match existing database storage formats:
 * - Canonical E.164: +8801XXXXXXXXX
 * - Local 11 digits: 01XXXXXXXXX
 * - 13 digits: 8801XXXXXXXXX
 * - 10 digits: 1XXXXXXXXX
 */
function getPhoneSearchVariants(raw: string): string[] {
  const norm = normalizePhoneNumber(raw);
  const variants = new Set<string>();
  const trimmed = raw.trim();
  const digits = raw.replace(/\D/g, "");

  if (trimmed) variants.add(trimmed);
  if (norm.formatted) variants.add(norm.formatted);

  if (norm.isBD && norm.formatted.startsWith("+880")) {
    const local11 = "0" + norm.formatted.slice(4); // 017...
    const full13 = norm.formatted.slice(1);        // 88017...
    const local10 = norm.formatted.slice(4);       // 17...
    variants.add(local11);
    variants.add(full13);
    variants.add(local10);
  }

  if (digits) {
    variants.add(digits);
    if (!digits.startsWith("+")) variants.add(`+${digits}`);
  }

  return Array.from(variants);
}

/**
 * Distributed rate limiter via PostgreSQL RPC check_and_increment_rate_limit.
 * Fails closed: if the RPC fails or is missing, rejects safely to prevent brute force attacks.
 */
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

/**
 * Timing jitter to equalize response latency against timing side-channel attacks
 */
async function timingJitter() {
  const jitterMs = 120 + Math.floor(Math.random() * 80);
  await new Promise((resolve) => setTimeout(resolve, jitterMs));
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const validatedOrigin = getValidatedOrigin(req);

  // 1. Strictly process CORS preflight (OPTIONS) requests immediately
  if (req.method === "OPTIONS") {
    // If an Origin was explicitly passed and failed validation, block preflight
    if (origin && !validatedOrigin) {
      return new Response(JSON.stringify({ error: "Origin not allowed by CORS policy." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return standard preflight 204 No Content with validated CORS headers
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }

  // 2. Helper to construct JSON responses with validated CORS headers for this request
  const respond = (body: unknown, status = 200): Response => {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json",
      },
    });
  };

  // 3. Strictly verify that the handler only accepts POST requests
  if (req.method !== "POST") {
    return respond({ error: "Method not allowed. Only POST and OPTIONS are accepted." }, 405);
  }

  // 4. Strict Origin check on POST requests
  if (origin && !validatedOrigin) {
    return new Response(JSON.stringify({ error: "Origin not allowed by CORS policy." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return respond(
        { error: "Supabase service credentials not configured in Edge Runtime." },
        500
      );
    }

    if (!supabaseAnonKey) {
      return respond(
        { error: "SUPABASE_ANON_KEY must be configured in Edge Function environment for public auth." },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 5. Client IP Identification
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "edge-client";

    const body = await req.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
      return respond(
        { error: "Please enter your mobile number and password." },
        400
      );
    }

    const cleanInput = identifier.trim();
    const phoneNorm = normalizePhoneNumber(cleanInput);

    if (!phoneNorm.isValid) {
      return respond(
        { error: phoneNorm.error || "Please enter a valid mobile number (e.g. 017xxxxxxxx or +8801xxxxxxxx)." },
        400
      );
    }

    const normalizedPhone = phoneNorm.formatted;

    // 6. Distributed Atomic Rate Limiting (Server-side via PostgreSQL RPC)
    // Rate limit per IP (15 attempts / min) and per Phone identifier (5 attempts / min)
    const ipCheck = await checkDistributedRateLimit(supabaseAdmin, `login_ip:${clientIp}`, 15, 60);
    const phoneCheck = await checkDistributedRateLimit(supabaseAdmin, `login_phone:${normalizedPhone}`, 5, 60);

    // Fail closed if rate limiter RPC failed
    if (ipCheck.rpcError || phoneCheck.rpcError) {
      console.error("Rate limiter verification failed. Rejecting login safely.");
      return respond(
        { error: "Authentication security check temporarily unavailable. Please try again shortly." },
        503
      );
    }

    // Rate limit exceeded check
    if (!ipCheck.allowed || !phoneCheck.allowed) {
      return respond(
        { error: "Too many login attempts. For institutional security, please wait 60 seconds before trying again." },
        429
      );
    }

    // 7. Resolve registered mobile number to alumni profile
    // Uses canonical search variants to match any legacy format stored in the database
    const variants = getPhoneSearchVariants(cleanInput);
    const orCondition = variants.map((v) => `phone.eq.${v}`).join(",");

    let { data: profile, error: profileErr } = await supabaseAdmin
      .from("alumni_profiles")
      .select("id, auth_user_id, email, phone, full_name, phone_ownership_verified")
      .or(orCondition)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (profileErr) {
      console.warn("Database lookup notice:", profileErr.message);
    }

    // Secondary fallback for numbers with spaces or hyphens
    if (!profile) {
      const digits = cleanInput.replace(/\D/g, "");
      if (digits.length >= 10) {
        const last10 = digits.slice(-10);
        const { data: candidates } = await supabaseAdmin
          .from("alumni_profiles")
          .select("id, auth_user_id, email, phone, full_name, phone_ownership_verified")
          .ilike("phone", `%${last10}%`)
          .limit(5);

        if (candidates && candidates.length > 0) {
          profile = candidates.find((c) => {
            const cDigits = (c.phone || "").replace(/\D/g, "");
            return cDigits.endsWith(last10);
          }) || null;
        }
      }
    }

    // Anti-enumeration defense: Account does not exist
    // (Note: Admin phone verification is NOT required; mobile number is only an alternative login identifier)
    if (!profile) {
      await timingJitter();
      return respond({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // 8. Retrieve registered email for this alumni profile
    let registeredEmail = profile.email?.trim().toLowerCase() || "";

    // Guarantee exact email by querying auth.users via auth_user_id if available
    if (profile.auth_user_id) {
      try {
        const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(
          profile.auth_user_id
        );
        if (!authUserErr && authUserData?.user?.email) {
          registeredEmail = authUserData.user.email.trim().toLowerCase();
        }
      } catch (lookupErr) {
        console.warn("Notice retrieving auth user by ID:", lookupErr);
      }
    }

    if (!registeredEmail) {
      await timingJitter();
      return respond({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // 9. Authenticate against Supabase Auth using SUPABASE_ANON_KEY
    // Authenticates using registered email + user's password.
    // NEVER uses SERVICE_ROLE_KEY for user password verification.
    const publicAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: signInData, error: signInErr } = await publicAuthClient.auth.signInWithPassword({
      email: registeredEmail,
      password: password,
    });

    // Check email confirmation status (preserve mandatory email verification)
    if (signInErr) {
      const errMsg = signInErr.message.toLowerCase();
      if (errMsg.includes("email not confirmed")) {
        await timingJitter();
        return respond(
          {
            error: "Your email address has not been confirmed yet. Please check your inbox or spam folder for the Supabase confirmation link.",
          },
          401
        );
      }

      // Generic authentication error on bad password
      await timingJitter();
      return respond({ error: GENERIC_AUTH_ERROR }, 401);
    }

    if (!signInData?.session || !signInData?.user) {
      await timingJitter();
      return respond({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // 10. Security verification: Ensure the authenticated user ID strictly matches profile.auth_user_id
    if (profile.auth_user_id && signInData.user.id !== profile.auth_user_id) {
      console.error(
        `User ID mismatch: authenticated ${signInData.user.id} does not match profile auth_user_id ${profile.auth_user_id}`
      );
      await timingJitter();
      return respond({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // Link profile to auth_user_id if not previously linked (without touching phone verification status)
    if (!profile.auth_user_id && signInData.user.id) {
      await supabaseAdmin
        .from("alumni_profiles")
        .update({ auth_user_id: signInData.user.id, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
    }

    // 11. Return official Supabase session to client
    return respond(
      {
        success: true,
        session: signInData.session,
        user: signInData.user,
        profileId: profile.id,
      },
      200
    );
  } catch (err: any) {
    console.error("unified-phone-login exception:", err);
    return respond(
      { error: "Authentication service temporarily unavailable. Please try again." },
      500
    );
  }
});
