// =============================================================================
// SUPABASE EDGE FUNCTION: admin-verify-phone
// Project: Notre Dame College Alumni Network (NDC Dhaka)
// Runtime: Deno (Supabase Edge Runtime)
// Description: Allows authorized administrators to verify or revoke phone
//              ownership for alumni accounts.
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SUPER_ADMIN_EMAILS = new Set([
  "nurulanambashirdamian@gmail.com",
  "nurulanambashir20@gmail.com",
  "admin@ndcalumni.org",
  "bashir@ndcalumni.org",
]);

function formatToE164(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.startsWith("+")) return cleaned.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  return `+880${digits.replace(/^0+/, "")}`;
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
        JSON.stringify({ error: "Supabase service credentials not configured." }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Authenticate caller via JWT Bearer Header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing administrative authorization token." }),
        { status: 401, headers: corsHeaders }
      );
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);

    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired administrative token." }),
        { status: 401, headers: corsHeaders }
      );
    }

    const caller = userData.user;
    const callerEmail = (caller.email || "").toLowerCase().trim();

    // 2. Authorize Admin Privileges
    const { data: callerProfile } = await supabaseAdmin
      .from("alumni_profiles")
      .select("id, role")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    const isAuthorized =
      SUPER_ADMIN_EMAILS.has(callerEmail) ||
      callerProfile?.role === "super_admin" ||
      callerProfile?.role === "admin";

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Administrator permissions required." }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Parse action and profileId
    const body = await req.json().catch(() => ({}));
    const { profileId, action = "verify", notes } = body;

    if (!profileId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: profileId" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const targetProfileId = Number(profileId);
    const now = new Date().toISOString();

    // Fetch target profile
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from("alumni_profiles")
      .select("*")
      .eq("id", targetProfileId)
      .single();

    if (targetErr || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Target alumni profile not found." }),
        { status: 404, headers: corsHeaders }
      );
    }

    // =========================================================================
    // ACTION: VERIFY PHONE
    // =========================================================================
    if (action === "verify") {
      const rawPhone = (targetProfile.phone || "").trim();
      if (!rawPhone) {
        return new Response(
          JSON.stringify({ error: "Alumnus does not have a registered mobile number to verify." }),
          { status: 400, headers: corsHeaders }
        );
      }

      const normalizedPhone = formatToE164(rawPhone);

      // Check for duplicate verified phone on another account
      const { data: existingDup } = await supabaseAdmin
        .from("alumni_profiles")
        .select("id, full_name")
        .eq("phone", normalizedPhone)
        .eq("phone_ownership_verified", true)
        .neq("id", targetProfileId)
        .maybeSingle();

      if (existingDup) {
        return new Response(
          JSON.stringify({
            error: `This phone number (${normalizedPhone}) is already verified for ${existingDup.full_name} (ID: ${existingDup.id}). Dual-account phone reuse is prohibited.`,
          }),
          { status: 409, headers: corsHeaders }
        );
      }

      // Update public.alumni_profiles
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("alumni_profiles")
        .update({
          phone: normalizedPhone,
          phone_ownership_verified: true,
          phone_verified_at: now,
          phone_verified_by_profile_id: callerProfile?.id || null,
          phone_verification_notes: notes || "Verified by central administrator",
          updated_at: now,
        })
        .eq("id", targetProfileId)
        .select()
        .single();

      if (updateErr) {
        console.error("Update profile error:", updateErr);
      }

      // Sync phone with auth.users
      if (targetProfile.auth_user_id) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(targetProfile.auth_user_id, {
            phone: normalizedPhone,
            phone_confirm: true,
          });
        } catch (authErr) {
          console.warn("GoTrue phone confirm notice:", authErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Phone ownership verified for ${targetProfile.full_name}. Phone + Password login is active.`,
          profile: updated || targetProfile,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // =========================================================================
    // ACTION: REVOKE PHONE VERIFICATION
    // =========================================================================
    if (action === "revoke") {
      await supabaseAdmin
        .from("alumni_profiles")
        .update({
          phone_ownership_verified: false,
          phone_verified_at: null,
          phone_verification_notes: notes || "Phone verification revoked by administrator",
          updated_at: now,
        })
        .eq("id", targetProfileId);

      // Also revoke phone from auth.users so direct GoTrue phone authentication is revoked
      if (targetProfile.auth_user_id) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(targetProfile.auth_user_id, {
            phone: null as any,
          });
        } catch (revokeAuthErr) {
          console.warn("GoTrue revoke notice:", revokeAuthErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Phone ownership verification revoked for ${targetProfile.full_name}. Phone login disabled.`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("admin-verify-phone exception:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error." }),
      { status: 500, headers: corsHeaders }
    );
  }
});
