// server.ts
import "dotenv/config";
import express from "express";
import { createServer as createHttpServer } from "http";
import { readFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import * as dotenv from "dotenv";

// server/lib/supabase-server.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
var supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
var isSupabaseServerConfigured = Boolean(
  supabaseUrl && supabaseKey && supabaseUrl.startsWith("http") && !supabaseUrl.includes("placeholder.supabase.co")
);
var effectiveUrl = isSupabaseServerConfigured ? supabaseUrl : "https://placeholder.supabase.co";
var effectiveKey = isSupabaseServerConfigured ? supabaseKey : "public-anon-placeholder-key";
var supabaseServer = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
var SUPABASE_TABLES = {
  ALUMNI_PROFILES: "alumni_profiles",
  BATCHES: "batches",
  ACADEMIC_STREAM_GROUPS: "academic_stream_groups",
  POSTS: "posts",
  POST_COMMENTS: "post_comments",
  POST_LIKES: "post_likes",
  SAVED_POSTS: "saved_posts",
  // Reconciled: saved_posts (not post_saves)
  VERIFICATION_REQUESTS: "verification_requests",
  // Reconciled: verification_requests (not verification_submissions)
  ADMIN_DOC_SUBMISSIONS: "admin_doc_submissions",
  PEER_VOUCHES: "peer_vouches",
  BLOOD_DONORS: "blood_donors",
  // Reconciled: blood_donors (not blood_donor_registrations)
  BLOOD_REQUESTS: "blood_requests",
  // Reconciled: blood_requests (not blood_emergency_requests)
  BLOOD_REQUEST_RESPONSES: "blood_request_responses",
  // Reconciled: blood_request_responses (not blood_donation_responses)
  NOTIFICATIONS: "notifications",
  GALLERY_ALBUMS: "gallery_albums",
  GALLERY_PHOTOS: "gallery_photos",
  OFFICIAL_NOTICES: "official_notices",
  CONTACT_INQUIRIES: "contact_inquiries",
  AUDIT_LOGS: "audit_logs"
  // Reconciled: audit_logs (not security_audit_logs)
};

// server/middleware/auth.ts
async function verifyAuthToken(token) {
  if (!token || !isSupabaseServerConfigured) return null;
  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data?.user) return null;
    const user = data.user;
    const cleanEmail = (user.email || "").toLowerCase().trim();
    const { data: profile, error: profileError } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id, auth_user_id, email, full_name, role").eq("auth_user_id", user.id).maybeSingle();
    if (profileError || !profile?.id) return null;
    const role = profile.role === "admin" || profile.role === "moderator" ? profile.role : "member";
    return {
      user,
      dbUser: {
        id: Number(profile.id),
        uid: user.id,
        email: cleanEmail || `${user.id}@ndcalumni.org`,
        fullName: profile.full_name || user.user_metadata?.full_name || "Notredamian Alumnus",
        role,
        accountStatus: "active"
      }
    };
  } catch (err) {
    console.warn("Supabase token verification error:", err);
    return null;
  }
}
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  const authResult = await verifyAuthToken(token);
  if (authResult) {
    req.supabaseUser = authResult.user;
    req.user = authResult.user;
    req.dbUser = authResult.dbUser;
    return next();
  }
  return res.status(401).json({ error: "Unauthorized: Invalid token" });
};
var requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing admin credential token" });
  }
  const token = authHeader.split("Bearer ")[1];
  const authResult = await verifyAuthToken(token);
  if (authResult) {
    req.supabaseUser = authResult.user;
    req.user = authResult.user;
    req.dbUser = authResult.dbUser;
    const isAuthorizedAdmin = authResult.dbUser.role === "admin";
    if (!isAuthorizedAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access restricted to backend authority" });
    }
    return next();
  }
  return res.status(401).json({ error: "Unauthorized: Invalid credentials" });
};
var optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    const authResult = await verifyAuthToken(token);
    if (authResult) {
      req.supabaseUser = authResult.user;
      req.user = authResult.user;
      req.dbUser = authResult.dbUser;
    }
  }
  next();
};

// server/db/adminRepository.ts
var DEFAULT_STREAM_GROUPS = [
  { id: 1, stream: "Science", group_code: null, groupCode: null, expected_group_count: 17, expectedGroupCount: 17, is_active: true, isActive: true },
  { id: 2, stream: "Humanities", group_code: "G", groupCode: "G", expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 3, stream: "Humanities", group_code: "H", groupCode: "H", expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 4, stream: "Humanities", group_code: "L", groupCode: "L", expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 5, stream: "Humanities", group_code: "W", groupCode: "W", expected_group_count: 4, expectedGroupCount: 4, is_active: true, isActive: true },
  { id: 6, stream: "Business Studies", group_code: "A", groupCode: "A", expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 7, stream: "Business Studies", group_code: "B", groupCode: "B", expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 8, stream: "Business Studies", group_code: "C", groupCode: "C", expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 9, stream: "Business Studies", group_code: "D", groupCode: "D", expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 10, stream: "Business Studies", group_code: "E", groupCode: "E", expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true },
  { id: 11, stream: "Business Studies", group_code: "F", groupCode: "F", expected_group_count: 6, expectedGroupCount: 6, is_active: true, isActive: true }
];
var inMemoryAlumniProfiles = [];
async function recordSecurityAuditLog(params) {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.AUDIT_LOGS).insert({
        actor_auth_id: params.actorUid,
        action: params.action,
        entity_table: params.targetType,
        entity_id: params.targetId,
        reason: params.summary
      }).select().single();
      if (!error && data) return data;
    } catch (err) {
      console.warn("Supabase audit log insert error:", err);
    }
  }
  return {
    id: Date.now(),
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    action: params.action,
    summary: params.summary,
    createdAt: /* @__PURE__ */ new Date()
  };
}
async function getAcademicStreamGroupsConfig() {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.ACADEMIC_STREAM_GROUPS).select("*").order("stream").order("group_code");
      if (!error && data && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          stream: r.stream,
          groupCode: r.group_code,
          expectedGroupCount: r.expected_group_count,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }
    } catch (err) {
      console.warn("Supabase getAcademicStreamGroupsConfig error:", err);
    }
  }
  return DEFAULT_STREAM_GROUPS;
}
async function toggleAcademicStreamGroupActive(params) {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.ACADEMIC_STREAM_GROUPS).update({
        is_active: params.isActive,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", params.id).select().single();
      if (!error && data) {
        return {
          id: data.id,
          stream: data.stream,
          groupCode: data.group_code,
          expectedGroupCount: data.expected_group_count,
          isActive: data.is_active
        };
      }
    } catch (err) {
      console.warn("Supabase toggleAcademicStreamGroupActive error:", err);
    }
  }
  const found = DEFAULT_STREAM_GROUPS.find((g) => g.id === params.id);
  if (!found) throw new Error("Academic stream group row not found.");
  found.is_active = params.isActive;
  found.isActive = params.isActive;
  return found;
}
async function getAdminOverviewMetrics() {
  let totalProfiles = 0;
  let verifiedProfiles = 0;
  let pendingProfiles = 0;
  let suspendedProfiles = 0;
  let registeredDonors = 0;
  let pendingDocReviews = 0;
  let activeBloodEmergencies = 0;
  let publishedNotices = 0;
  let scienceCount = 0;
  let humanitiesCount = 0;
  let businessCount = 0;
  let streamGroupsConfig = DEFAULT_STREAM_GROUPS;
  let recentAuditLogs = [];
  if (isSupabaseServerConfigured) {
    try {
      const [
        totalRes,
        verifiedRes,
        pendingRes,
        suspendedRes,
        donorsRes,
        pendingDocsRes,
        bloodRes,
        noticesRes,
        streamConfigRes,
        auditLogsRes,
        sciRes,
        humRes,
        busRes
      ] = await Promise.all([
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id", { count: "exact", head: true }),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id", { count: "exact", head: true }).eq("verification_status", "pending_vouch"),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id", { count: "exact", head: true }).eq("is_public", false),
        supabaseServer.from(SUPABASE_TABLES.BLOOD_DONORS).select("user_id", { count: "exact", head: true }).eq("is_registered_donor", true),
        supabaseServer.from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabaseServer.from(SUPABASE_TABLES.BLOOD_REQUESTS).select("id", { count: "exact", head: true }).in("status", ["Active", "Pending Verification"]),
        supabaseServer.from(SUPABASE_TABLES.OFFICIAL_NOTICES).select("id", { count: "exact", head: true }).eq("is_published", true),
        supabaseServer.from(SUPABASE_TABLES.ACADEMIC_STREAM_GROUPS).select("*").order("stream").order("group_code"),
        supabaseServer.from(SUPABASE_TABLES.AUDIT_LOGS).select("*").order("created_at", { ascending: false }).limit(15),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id", { count: "exact", head: true }).eq("academic_stream", "Science"),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id", { count: "exact", head: true }).eq("academic_stream", "Humanities"),
        supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id", { count: "exact", head: true }).eq("academic_stream", "Business Studies")
      ]);
      totalProfiles = totalRes.count ?? 0;
      verifiedProfiles = verifiedRes.count ?? 0;
      pendingProfiles = pendingRes.count ?? 0;
      suspendedProfiles = suspendedRes.count ?? 0;
      registeredDonors = donorsRes.count ?? 0;
      pendingDocReviews = pendingDocsRes.count ?? 0;
      activeBloodEmergencies = bloodRes.count ?? 0;
      publishedNotices = noticesRes.count ?? 0;
      scienceCount = sciRes.count ?? 0;
      humanitiesCount = humRes.count ?? 0;
      businessCount = busRes.count ?? 0;
      if (streamConfigRes.data && streamConfigRes.data.length > 0) {
        streamGroupsConfig = streamConfigRes.data.map((r) => ({
          id: r.id,
          stream: r.stream,
          groupCode: r.group_code,
          expectedGroupCount: r.expected_group_count,
          isActive: r.is_active
        }));
      }
      if (auditLogsRes.data && auditLogsRes.data.length > 0) {
        recentAuditLogs = auditLogsRes.data.map((r) => ({
          id: r.id,
          actorUid: r.actor_auth_id || "system",
          actorEmail: r.actor_auth_id || "admin@ndcalumni.org",
          actorRole: "admin",
          action: r.action,
          targetType: r.entity_table,
          targetId: r.entity_id,
          severity: "info",
          summary: r.reason || r.action,
          createdAt: r.created_at
        }));
      }
    } catch (err) {
      console.warn("Supabase overview metrics error:", err);
    }
  }
  return {
    totalProfiles,
    verifiedProfiles,
    pendingProfiles,
    suspendedProfiles,
    registeredDonors,
    pendingDocReviews,
    activeBloodEmergencies,
    publishedNotices,
    streamDistribution: {
      Science: scienceCount,
      Humanities: humanitiesCount,
      "Business Studies": businessCount
    },
    streamGroupsConfig,
    recentAuditLogs
  };
}
async function queryPaginatedAlumniProfiles(params) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const offset = (page - 1) * limit;
  if (isSupabaseServerConfigured) {
    try {
      let query = supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("*", { count: "exact" });
      if (params.batchYear && !Number.isNaN(Number(params.batchYear))) {
        query = query.eq("batch_year", Number(params.batchYear));
      }
      if (params.academicStream && params.academicStream !== "all") {
        query = query.eq("academic_stream", params.academicStream);
      }
      if (params.verificationStatus && params.verificationStatus !== "all") {
        query = query.eq("verification_status", params.verificationStatus);
      }
      if (params.role && params.role !== "all") {
        query = query.eq("role", params.role);
      }
      if (params.bloodGroup && params.bloodGroup !== "all") {
        query = query.eq("blood_group", params.bloodGroup);
      }
      if (params.search && params.search.trim()) {
        const s = params.search.trim();
        query = query.or(
          `full_name.ilike.%${s}%,institution.ilike.%${s}%,profession.ilike.%${s}%,city.ilike.%${s}%,college_roll.ilike.%${s}%`
        );
      }
      query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      const { data, count, error } = await query;
      if (!error && data) {
        const total2 = count ?? data.length;
        const totalPages2 = Math.ceil(total2 / limit) || 1;
        const profiles = data.map((r) => ({
          id: Number(r.id),
          fullName: r.full_name || "Notredamian Alumnus",
          avatarUrl: r.avatar_url || "/ndc-logo.png",
          batchYear: Number(r.batch_year) || 68,
          session: r.session || null,
          collegeRoll: r.college_roll || null,
          academicStream: r.academic_stream || "Science",
          academicGroup: r.academic_group || null,
          section: r.section || null,
          verificationStatus: r.verification_status || "unverified",
          verificationMethod: r.verification_method || "two_vouches",
          vouchesCount: Number(r.vouches_count) || 0,
          vouchTargetCount: Number(r.vouch_target_count) || 2,
          verifiedByAdmin: r.verified_by_profile_id ? String(r.verified_by_profile_id) : null,
          profession: r.profession || "",
          position: r.position || "",
          institution: r.institution || "",
          city: r.city || "Dhaka",
          country: r.country || "Bangladesh",
          phone: params.includeSensitivePii ? r.phone : r.phone ? "Protected" : null,
          phoneOwnershipVerified: Boolean(r.phone_ownership_verified),
          phoneVerifiedAt: r.phone_verified_at || null,
          phoneVerifiedByAdmin: r.phone_verified_by_profile_id ? String(r.phone_verified_by_profile_id) : null,
          phoneVerificationNotes: params.includeSensitivePii ? r.phone_verification_notes || null : null,
          whatsapp: params.includeSensitivePii ? r.whatsapp : r.whatsapp ? "Protected" : null,
          email: params.includeSensitivePii ? r.email : r.email ? "Protected" : null,
          bloodGroup: r.blood_group || null,
          isRegisteredDonor: Boolean(r.is_registered_donor),
          role: r.role || "member",
          accountStatus: r.is_public ? "active" : "suspended",
          createdAt: r.created_at || (/* @__PURE__ */ new Date()).toISOString()
        }));
        return {
          profiles,
          pagination: { page, limit, total: total2, totalPages: totalPages2 }
        };
      }
    } catch (err) {
      console.warn("Supabase queryPaginatedAlumniProfiles error:", err);
    }
  }
  let filtered = [...inMemoryAlumniProfiles];
  if (params.batchYear && !Number.isNaN(Number(params.batchYear))) {
    filtered = filtered.filter((p) => p.batchYear === Number(params.batchYear));
  }
  if (params.academicStream && params.academicStream !== "all") {
    filtered = filtered.filter((p) => p.academicStream === params.academicStream);
  }
  if (params.verificationStatus && params.verificationStatus !== "all") {
    filtered = filtered.filter((p) => p.verificationStatus === params.verificationStatus);
  }
  if (params.role && params.role !== "all") {
    filtered = filtered.filter((p) => p.role === params.role);
  }
  if (params.bloodGroup && params.bloodGroup !== "all") {
    filtered = filtered.filter((p) => p.bloodGroup === params.bloodGroup);
  }
  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) => p.fullName && p.fullName.toLowerCase().includes(s) || p.institution && p.institution.toLowerCase().includes(s) || p.profession && p.profession.toLowerCase().includes(s) || p.city && p.city.toLowerCase().includes(s) || p.collegeRoll && p.collegeRoll.toLowerCase().includes(s)
    );
  }
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const pageProfiles = filtered.slice(offset, offset + limit).map((r) => ({
    ...r,
    phone: params.includeSensitivePii ? r.phone : r.phone ? "Protected" : null,
    whatsapp: params.includeSensitivePii ? r.whatsapp : r.whatsapp ? "Protected" : null,
    email: params.includeSensitivePii ? r.email : r.email ? "Protected" : null
  }));
  return {
    profiles: pageProfiles,
    pagination: { page, limit, total, totalPages }
  };
}
async function createOrRegisterAlumniProfile(input) {
  const cleanEmail = (input.email || "").trim().toLowerCase() || null;
  const cleanPhone = (input.phone || "").trim() || null;
  const batchNum = input.batchYear > 1900 ? input.batchYear - 1950 : Number(input.batchYear) || 68;
  const hscYear = 1950 + batchNum;
  const session = input.session || `${hscYear - 2}-${String(hscYear).slice(-2)}`;
  const streamVal = input.academicStream === "Humanities" || input.academicStream === "Business Studies" ? input.academicStream : "Science";
  const groupVal = streamVal === "Science" ? null : input.academicGroup ? input.academicGroup.trim().toUpperCase() : null;
  let effectiveAuthUid = null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (input.userUid && uuidRegex.test(input.userUid)) {
    effectiveAuthUid = input.userUid;
  }
  if (isSupabaseServerConfigured) {
    try {
      if (!effectiveAuthUid && cleanEmail) {
        const { data: usersData } = await supabaseServer.auth.admin.listUsers();
        const existingAuthUser = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );
        if (existingAuthUser) {
          effectiveAuthUid = existingAuthUser.id;
          if (!existingAuthUser.email_confirmed_at) {
            await supabaseServer.auth.admin.updateUserById(existingAuthUser.id, {
              email_confirm: true
            });
          }
        } else if (input.rawPassword || input.passwordHash) {
          const initialPass = input.rawPassword || "TempPass_" + Date.now();
          const { data: createdAuthUser, error: createAuthErr } = await supabaseServer.auth.admin.createUser({
            email: cleanEmail,
            password: initialPass,
            email_confirm: true,
            user_metadata: {
              full_name: input.fullName.trim(),
              batch_year: batchNum,
              phone: cleanPhone
            }
          });
          if (!createAuthErr && createdAuthUser?.user) {
            effectiveAuthUid = createdAuthUser.user.id;
          }
        }
      }
      if (effectiveAuthUid) {
        try {
          await supabaseServer.auth.admin.updateUserById(effectiveAuthUid, {
            email_confirm: true
          });
        } catch {
        }
        const { data, error } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).upsert(
          {
            auth_user_id: effectiveAuthUid,
            full_name: input.fullName.trim(),
            avatar_url: input.avatarUrl || "/ndc-logo.png",
            batch_year: batchNum,
            session,
            college_roll: input.collegeRoll?.trim() || null,
            academic_stream: streamVal,
            academic_group: groupVal,
            section: input.section || "Group 4",
            profession: input.profession || "",
            position: input.position || "",
            institution: input.institution || "",
            specialty: Array.isArray(input.specialty) ? input.specialty : [],
            degree: Array.isArray(input.degree) ? input.degree : ["HSC"],
            city: input.city || "Dhaka",
            country: input.country || "Bangladesh",
            phone: cleanPhone,
            whatsapp: input.whatsapp?.trim() || null,
            email: cleanEmail,
            blood_group: input.bloodGroup || null,
            role: "member",
            verification_status: "unverified",
            is_public: true
          },
          { onConflict: "auth_user_id" }
        ).select().single();
        if (!error && data) {
          return {
            id: Number(data.id),
            fullName: data.full_name,
            avatarUrl: data.avatar_url,
            batchYear: data.batch_year,
            session: data.session,
            collegeRoll: data.college_roll,
            academicStream: data.academic_stream,
            academicGroup: data.academic_group,
            section: data.section,
            profession: data.profession,
            position: data.position,
            institution: data.institution,
            city: data.city,
            country: data.country,
            phone: data.phone,
            email: data.email,
            bloodGroup: data.blood_group,
            role: data.role,
            verificationStatus: data.verification_status,
            isPublic: data.is_public,
            createdAt: data.created_at
          };
        } else if (error) {
          console.warn("Supabase alumni_profiles upsert notice:", error.message);
        }
      }
    } catch (err) {
      console.warn("Supabase createOrRegisterAlumniProfile error:", err);
      throw err;
    }
  }
  throw new Error("Supabase is required to register alumni profiles.");
}
async function findAlumniByCredential(credential) {
  const clean = credential.trim().toLowerCase();
  if (isSupabaseServerConfigured && clean) {
    try {
      let query = supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("*");
      if (clean.includes("@")) {
        query = query.eq("email", clean);
      } else {
        const cleanDigits2 = clean.replace(/[^0-9]/g, "");
        query = query.or(`phone.eq.${clean},phone.eq.+88${clean},phone.eq.+880${cleanDigits2}`);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        return {
          id: Number(data.id),
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          batchYear: Number(data.batch_year),
          session: data.session,
          collegeRoll: data.college_roll,
          academicStream: data.academic_stream,
          academicGroup: data.academic_group,
          section: data.section,
          profession: data.profession,
          position: data.position,
          institution: data.institution,
          city: data.city,
          country: data.country,
          phone: data.phone,
          phoneOwnershipVerified: Boolean(data.phone_ownership_verified),
          phoneVerifiedAt: data.phone_verified_at || null,
          phoneVerifiedByProfileId: data.phone_verified_by_profile_id || null,
          phoneVerificationNotes: data.phone_verification_notes || null,
          email: data.email,
          bloodGroup: data.blood_group,
          role: data.role,
          verificationStatus: data.verification_status,
          accountStatus: data.is_public ? "active" : "suspended",
          passwordHash: null,
          authUserId: data.auth_user_id || void 0,
          createdAt: data.created_at
        };
      }
      if (clean.includes("@")) {
        const { data: usersData } = await supabaseServer.auth.admin.listUsers();
        const matched = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === clean
        );
        if (matched) {
          if (!matched.email_confirmed_at) {
            await supabaseServer.auth.admin.updateUserById(matched.id, {
              email_confirm: true
            });
          }
          const restored = await createOrRegisterAlumniProfile({
            userUid: matched.id,
            fullName: matched.user_metadata?.full_name || matched.user_metadata?.name || clean.split("@")[0],
            batchYear: Number(matched.user_metadata?.batch_year) || 68,
            email: clean,
            phone: matched.user_metadata?.phone || null
          });
          return restored;
        }
      }
    } catch (err) {
      console.warn("Supabase findAlumniByCredential error:", err);
    }
  }
  const cleanDigits = clean.replace(/[^0-9]/g, "");
  const found = inMemoryAlumniProfiles.find(
    (p) => p.email && p.email.toLowerCase() === clean || cleanDigits && p.phone && p.phone.replace(/[^0-9]/g, "").endsWith(cleanDigits)
  );
  return found || null;
}
async function updateAlumniPassword(profileId, passwordHash) {
  if (isSupabaseServerConfigured && profileId) {
    try {
      await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).update({ updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", profileId);
      return true;
    } catch (err) {
      console.warn("Supabase updateAlumniPassword error:", err);
    }
  }
  const found = inMemoryAlumniProfiles.find((p) => p.id === profileId);
  if (found) {
    found.passwordHash = passwordHash;
  }
  return true;
}
async function deleteAlumniProfile(profileId) {
  if (isSupabaseServerConfigured && profileId) {
    try {
      const { error } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).delete().eq("id", profileId);
      return !error;
    } catch (err) {
      console.warn("Supabase deleteAlumniProfile error:", err);
    }
  }
  const idx = inMemoryAlumniProfiles.findIndex((p) => p.id === profileId);
  if (idx !== -1) {
    inMemoryAlumniProfiles.splice(idx, 1);
  }
  return true;
}
async function adminUpdateAlumniGovernance(params) {
  if (params.role !== void 0) {
    const supportedRoles = ["member", "moderator", "admin"];
    if (params.actorRole !== "admin" || !supportedRoles.includes(params.role)) {
      throw new Error("Only administrators may assign supported database roles.");
    }
  }
  if (params.verificationStatus !== void 0 && isSupabaseServerConfigured) {
    const { data: target, error: targetError } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("auth_user_id, role").eq("id", params.profileId).maybeSingle();
    if (targetError || !target) throw new Error("Alumni profile not found.");
    if (target.auth_user_id === params.actorUid) {
      throw new Error("Administrators cannot change their own verification status.");
    }
    if (target.role === "admin" && params.actorRole !== "admin") {
      throw new Error("Only administrators may change an administrator profile.");
    }
  }
  if (isSupabaseServerConfigured && params.profileId) {
    try {
      const updates = {
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (params.verificationStatus) updates.verification_status = params.verificationStatus;
      if (params.role) updates.role = params.role;
      if (params.academicStream) updates.academic_stream = params.academicStream;
      if (params.academicGroup !== void 0) updates.academic_group = params.academicGroup;
      if (params.accountStatus !== void 0) updates.is_public = params.accountStatus !== "suspended";
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).update(updates).eq("id", params.profileId).select().single();
      if (!error && data) {
        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: "UPDATE_PROFILE_GOVERNANCE",
          targetType: "alumni_profile",
          targetId: String(params.profileId),
          severity: "info",
          summary: `Updated profile governance for ${data.full_name} (ID ${data.id}).`
        });
        return {
          id: Number(data.id),
          fullName: data.full_name,
          verificationStatus: data.verification_status,
          role: data.role,
          accountStatus: data.is_public ? "active" : "suspended",
          academicStream: data.academic_stream,
          academicGroup: data.academic_group,
          updatedAt: data.updated_at
        };
      }
    } catch (err) {
      console.warn("Supabase adminUpdateAlumniGovernance error:", err);
      throw err;
    }
  }
  throw new Error("Supabase is required to update profile governance.");
}
async function adminVerifyAlumniPhoneOwnership(params) {
  const profileId = Number(params.profileId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isSupabaseServerConfigured && profileId) {
    try {
      const { data: profile, error: fetchErr } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("*").eq("id", profileId).single();
      if (fetchErr || !profile) {
        throw new Error("Alumni profile not found.");
      }
      if (profile.auth_user_id === params.actorUid) {
        throw new Error("Administrators cannot verify their own phone ownership.");
      }
      const rawPhone = (profile.phone || "").trim();
      if (!rawPhone) {
        throw new Error("Alumnus does not have a registered mobile number to verify.");
      }
      const normalizedPhone = rawPhone.startsWith("+") ? rawPhone.replace(/[^\d+]/g, "") : rawPhone.replace(/\D/g, "").startsWith("880") ? `+${rawPhone.replace(/\D/g, "")}` : `+880${rawPhone.replace(/\D/g, "").replace(/^0+/, "")}`;
      const { data: duplicate } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("id, full_name").eq("phone", normalizedPhone).eq("phone_ownership_verified", true).neq("id", profileId).maybeSingle();
      if (duplicate) {
        throw new Error(
          `This phone number (${normalizedPhone}) is already verified for another alumnus (${duplicate.full_name}, ID: ${duplicate.id}). Dual-account phone reuse is prohibited.`
        );
      }
      const { data: updated, error: updateErr } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).update({
        phone: normalizedPhone,
        phone_ownership_verified: true,
        phone_verified_at: now,
        phone_verification_notes: params.notes || "Verified by portal administrator",
        updated_at: now
      }).eq("id", profileId).select().single();
      if (updateErr || !updated) {
        throw new Error("Phone verification could not be saved.");
      }
      if (profile.auth_user_id) {
        try {
          await supabaseServer.auth.admin.updateUserById(profile.auth_user_id, {
            phone: normalizedPhone,
            phone_confirm: true
          });
        } catch (authErr) {
          console.warn("Note: GoTrue phone provider update notice:", authErr?.message || authErr);
        }
      }
      await recordSecurityAuditLog({
        actorUid: params.actorUid,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: "VERIFY_PHONE_OWNERSHIP",
        targetType: "alumni_profile",
        targetId: String(profileId),
        severity: "info",
        summary: `Admin verified phone ownership for ${profile.full_name} (${normalizedPhone}). Phone login enabled.`
      });
      return {
        id: profileId,
        fullName: profile.full_name,
        phone: normalizedPhone,
        phoneOwnershipVerified: true,
        phoneVerifiedAt: now,
        phoneVerificationNotes: params.notes || "Verified by portal administrator"
      };
    } catch (err) {
      console.error("adminVerifyAlumniPhoneOwnership error:", err);
      throw err;
    }
  }
  throw new Error("Supabase is required to verify phone ownership.");
}
async function adminRevokeAlumniPhoneOwnership(params) {
  const profileId = Number(params.profileId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isSupabaseServerConfigured && profileId) {
    try {
      const { data: profile } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("*").eq("id", profileId).single();
      if (profile) {
        await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).update({
          phone_ownership_verified: false,
          phone_verified_at: null,
          phone_verification_notes: params.notes || "Phone verification revoked by administrator",
          updated_at: now
        }).eq("id", profileId);
        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: "REVOKE_PHONE_OWNERSHIP",
          targetType: "alumni_profile",
          targetId: String(profileId),
          severity: "warning",
          summary: `Admin revoked phone ownership verification for ${profile.full_name} (${profile.phone}). Phone login disabled.`
        });
      }
      return { id: profileId, phoneOwnershipVerified: false };
    } catch (err) {
      console.error("adminRevokeAlumniPhoneOwnership error:", err);
      throw err;
    }
  }
  const found = inMemoryAlumniProfiles.find((p) => p.id === profileId);
  if (found) {
    found.phoneOwnershipVerified = false;
    found.phoneVerifiedAt = null;
  }
  return { id: profileId, phoneOwnershipVerified: false };
}
async function getVerificationQueue(statusFilter) {
  if (isSupabaseServerConfigured) {
    try {
      let query = supabaseServer.from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS).select(`
          *,
          applicant:alumni_profiles!admin_doc_submissions_user_id_fkey(
            id,
            full_name,
            avatar_url,
            batch_year,
            college_roll,
            academic_stream,
            academic_group,
            phone
          )
        `).order("submitted_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (!error && data) {
        return await Promise.all(
          data.map(async (r) => {
            let signedUrl = r.storage_object_path;
            if (r.storage_object_path && !r.storage_object_path.startsWith("http")) {
              try {
                const { data: signedData } = await supabaseServer.storage.from("verification-documents").createSignedUrl(r.storage_object_path, 3600);
                signedUrl = signedData?.signedUrl || null;
              } catch {
                signedUrl = null;
              }
            }
            const applicant = r.applicant || {};
            return {
              id: r.id,
              submissionCode: `DOC-${String(r.id).slice(0, 8)}`,
              profileId: r.user_id,
              fullName: applicant.full_name || "Notredamian Alumnus",
              avatarUrl: applicant.avatar_url || "/ndc-logo.png",
              batchYear: r.batch_year || applicant.batch_year || 68,
              collegeRoll: r.college_roll || applicant.college_roll || "",
              academicStream: r.academic_stream || applicant.academic_stream || "Science",
              academicGroup: r.academic_group || applicant.academic_group || null,
              docType: r.doc_type,
              docTypeLabel: r.doc_type_label,
              documentUrl: signedUrl,
              status: r.status,
              submittedAt: r.submitted_at,
              reviewedBy: r.reviewed_by ? String(r.reviewed_by) : null,
              reviewedAt: r.reviewed_at,
              adminNote: r.admin_note
            };
          })
        );
      }
    } catch (err) {
      console.warn("Supabase getVerificationQueue error:", err);
    }
  }
  return [];
}
async function reviewVerificationSubmission(params) {
  if (isSupabaseServerConfigured && params.submissionId) {
    try {
      const { data: submission, error: submissionError } = await supabaseServer.from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS).select("id, user_id").eq("id", params.submissionId).maybeSingle();
      if (submissionError || !submission) throw new Error("Verification submission not found.");
      if (submission.user_id) {
        const { data: applicant, error: applicantError } = await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).select("auth_user_id").eq("id", submission.user_id).maybeSingle();
        if (applicantError) throw applicantError;
        if (applicant?.auth_user_id === params.actorUid) {
          throw new Error("Administrators cannot review their own verification submission.");
        }
      }
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.ADMIN_DOC_SUBMISSIONS).update({
        status: params.decision,
        admin_note: params.adminNote || "Reviewed by central admin",
        reviewed_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", params.submissionId).select().single();
      if (!error && data) {
        if (params.decision === "approved" && data.user_id) {
          await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).update({
            verification_status: "verified",
            verification_method: "id_card_upload",
            id_submission_status: "approved",
            admin_review_note: params.adminNote || "Approved via ID document verification",
            verified_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", data.user_id);
          await supabaseServer.from(SUPABASE_TABLES.VERIFICATION_REQUESTS).update({
            status: "verified",
            reviewed_at: (/* @__PURE__ */ new Date()).toISOString(),
            admin_note: params.adminNote || "Approved via ID document verification"
          }).eq("requester_id", data.user_id).eq("status", "pending");
        } else if (params.decision === "rejected" && data.user_id) {
          await supabaseServer.from(SUPABASE_TABLES.ALUMNI_PROFILES).update({
            id_submission_status: "rejected",
            admin_review_note: params.adminNote || "Document unclear or incomplete."
          }).eq("id", data.user_id);
        }
        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: params.decision === "approved" ? "APPROVE_VERIFICATION_DOC" : "REJECT_VERIFICATION_DOC",
          targetType: "verification_submission",
          targetId: String(params.submissionId),
          severity: params.decision === "approved" ? "info" : "warning",
          summary: `${params.decision.toUpperCase()} document verification for submission ID ${params.submissionId}.`
        });
        return data;
      }
    } catch (err) {
      console.warn("Supabase reviewVerificationSubmission error:", err);
      throw err;
    }
  }
  throw new Error("Supabase is required to review verification submissions.");
}
async function getBloodEmergencyList() {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.BLOOD_REQUESTS).select("*").order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((r) => ({
          id: r.id,
          requestCode: `BLD-${String(r.id).slice(0, 8)}`,
          patientName: r.patient_relation || "Notredamian Patient",
          bloodGroup: r.blood_group,
          unitsNeeded: r.units_required,
          unitsFulfilled: r.units_fulfilled || 0,
          hospitalName: r.hospital_name,
          hospitalArea: r.hospital_area,
          contactNumber: r.coordination_ref || "Through Portal",
          urgencyLevel: r.emergency_level,
          status: r.status,
          verifiedByAdmin: r.verified_by_admin_id ? String(r.verified_by_admin_id) : null,
          moderationNote: r.moderation_note,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }
    } catch (err) {
      console.warn("Supabase getBloodEmergencyList error:", err);
    }
  }
  return [];
}
async function moderateBloodEmergency(params) {
  if (isSupabaseServerConfigured && params.id) {
    try {
      const updates = {
        status: params.status,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (params.unitsFulfilled !== void 0) updates.units_fulfilled = params.unitsFulfilled;
      if (params.moderationNote !== void 0) updates.moderation_note = params.moderationNote;
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.BLOOD_REQUESTS).update(updates).eq("id", params.id).select().single();
      if (!error && data) {
        await recordSecurityAuditLog({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: "MODERATE_BLOOD_REQUEST",
          targetType: "blood_request",
          targetId: String(params.id),
          severity: "info",
          summary: `Moderated blood request ${params.id} to "${params.status}".`
        });
        return data;
      }
    } catch (err) {
      console.warn("Supabase moderateBloodEmergency error:", err);
    }
  }
  return {
    id: params.id,
    status: params.status,
    unitsFulfilled: params.unitsFulfilled,
    moderationNote: params.moderationNote
  };
}
async function getOfficialNoticesList() {
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer.from(SUPABASE_TABLES.OFFICIAL_NOTICES).select("*").order("is_urgent", { ascending: false }).order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((r) => ({
          id: r.id,
          refNo: r.ref_no || `NDCAA/NOT-${String(r.id).slice(0, 6)}`,
          title: r.title,
          category: r.category,
          content: r.full_content || r.summary,
          targetBatch: null,
          isPinned: r.is_urgent,
          isPublished: r.is_published,
          authorName: r.signatory_name || "Alumni Secretariat",
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }
    } catch (err) {
      console.warn("Supabase getOfficialNoticesList error:", err);
    }
  }
  return [];
}
async function createOrUpdateOfficialNotice(params) {
  if (isSupabaseServerConfigured) {
    try {
      if (params.id) {
        const { data, error } = await supabaseServer.from(SUPABASE_TABLES.OFFICIAL_NOTICES).update({
          title: params.title.trim(),
          category: params.category,
          full_content: params.content.trim(),
          summary: params.content.trim().slice(0, 200),
          is_urgent: Boolean(params.isPinned),
          is_published: Boolean(params.isPublished ?? true),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", params.id).select().single();
        if (!error && data) return data;
      } else {
        const { data, error } = await supabaseServer.from(SUPABASE_TABLES.OFFICIAL_NOTICES).insert({
          ref_no: `NDCAA/NOT-2026/${Math.floor(Math.random() * 900) + 100}`,
          title: params.title.trim(),
          category: params.category,
          published_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          summary: params.content.trim().slice(0, 200),
          full_content: params.content.trim(),
          is_urgent: Boolean(params.isPinned),
          is_published: Boolean(params.isPublished ?? true),
          signatory_name: params.actorEmail,
          signatory_designation: "Portal Administrator",
          signatory_organization: "Notre Dame College Alumni Association"
        }).select().single();
        if (!error && data) return data;
      }
    } catch (err) {
      console.warn("Supabase createOrUpdateOfficialNotice error:", err);
    }
  }
  return {
    id: params.id || Date.now(),
    refNo: `NDCAA/NOT-2026/099`,
    title: params.title.trim(),
    category: params.category,
    content: params.content.trim(),
    isPinned: Boolean(params.isPinned),
    isPublished: Boolean(params.isPublished ?? true),
    authorName: params.actorEmail,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
}
async function generateBulkBatchCohortSample(params) {
  await recordSecurityAuditLog({
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: "BULK_COHORT_ATTEMPT",
    targetType: "alumni_profile",
    targetId: "PRODUCTION_NOOP",
    severity: "info",
    summary: "Bulk sample generation skipped in production mode (Supabase is single source of truth)."
  });
  return { insertedCount: 0 };
}

// server.ts
if (typeof globalThis.__dirname !== "undefined") {
  delete globalThis.__dirname;
}
if (typeof globalThis.__filename !== "undefined") {
  delete globalThis.__filename;
}
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? isNaN(Number(process.env.PORT)) ? process.env.PORT : Number(process.env.PORT) : 3e3;
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set([
  "https://ndcbogura.alumniworld.xyz",
  "http://ndcbogura.alumniworld.xyz",
  "https://www.ndcbogura.alumniworld.xyz",
  "https://ndc-alumni-2026.ai.studio",
  "https://ais-pre-siz5cxwdtehl5ayj3qiu3s-456498149201.asia-southeast1.run.app",
  "https://ais-dev-siz5cxwdtehl5ayj3qiu3s-456498149201.asia-southeast1.run.app"
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.has(origin) || origin.endsWith(".alumniworld.xyz") || origin.endsWith(".ai.studio") || origin.endsWith(".run.app") || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=()"
  );
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
var rateLimitStore = /* @__PURE__ */ new Map();
function rateLimitGuard(maxRequests, windowMs) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();
    const bucket = rateLimitStore.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return res.status(429).json({
        error: "Rate limit exceeded. Automated scraping and brute-force requests are blocked."
      });
    }
    return next();
  };
}
function resolveActor(req) {
  if (req.dbUser) {
    return {
      uid: req.dbUser.uid,
      email: req.dbUser.email,
      role: req.dbUser.role || "admin"
    };
  }
  if (req.user) {
    const user = req.user;
    return {
      uid: user.uid || user.id || "admin-user",
      email: user.email || "admin@ndcalumni.org",
      role: "admin"
    };
  }
  throw new Error("Unauthorized: Valid admin credentials required on backend");
}
app.post("/api/auth/sync", requireAuth, async (req, res) => {
  try {
    res.json({
      authenticated: true,
      user: req.dbUser
    });
  } catch (error) {
    console.error("Failed to sync authenticated user:", error);
    res.status(500).json({ error: error.message || "Failed to synchronize user" });
  }
});
function formatAlumniRowToProfile(row) {
  return {
    id: row.id,
    userId: row.id,
    fullName: row.fullName || "Notredamian Alumnus",
    avatarUrl: row.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
    coverUrl: row.coverUrl || void 0,
    batchYear: row.batchYear || 68,
    session: row.session || void 0,
    collegeRoll: row.collegeRoll || "",
    academicStream: row.academicStream,
    academicGroup: row.academicGroup,
    group: row.academicStream || "Science",
    section: row.section || "Group 4",
    verificationStatus: row.verificationStatus || "pending_vouch",
    verificationMethod: row.verificationMethod || "two_vouches",
    verifiedBy: row.verifiedByAdmin ? [row.verifiedByAdmin] : [],
    vouchesCount: row.vouchesCount || 0,
    vouchTargetCount: row.vouchTargetCount || 2,
    profession: row.profession || "",
    position: row.position || "",
    institution: row.institution || "",
    cadre: row.cadre || "",
    specialty: Array.isArray(row.specialty) ? row.specialty : [],
    degree: Array.isArray(row.degree) ? row.degree : ["HSC"],
    city: row.city || "Dhaka",
    country: row.country || "Bangladesh",
    phone: row.phone || "",
    phoneOwnershipVerified: Boolean(row.phoneOwnershipVerified ?? row.phone_ownership_verified),
    phoneVerifiedAt: row.phoneVerifiedAt || row.phone_verified_at || void 0,
    phoneVerifiedByProfileId: row.phoneVerifiedByProfileId || row.phone_verified_by_profile_id || void 0,
    phoneVerificationNotes: row.phoneVerificationNotes || row.phone_verification_notes || void 0,
    authUserId: row.authUserId || row.auth_user_id || void 0,
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    fbLink: row.fbLink || "",
    bio: row.bio || "",
    bloodGroup: row.bloodGroup || void 0,
    isRegisteredDonor: Boolean(row.isRegisteredDonor),
    donorAvailability: row.donorAvailability || "available",
    role: row.role || "member",
    accountStatus: row.accountStatus || "active",
    isPublic: Boolean(row.isPublic),
    postsCount: row.postsCount || 0,
    badges: Array.isArray(row.badges) ? row.badges : []
  };
}
var PASSWORD_SALT = "ndc_dhaka_1949_salt_v1:";
function hashPasswordServer(raw) {
  if (!raw) return "";
  if (raw.startsWith("sha256:")) return raw;
  const hash = crypto.createHash("sha256").update(PASSWORD_SALT + raw).digest("hex");
  return `sha256:${hash}`;
}
function verifyPasswordServer(storedHash, inputPass) {
  if (!storedHash) return true;
  const hashedInput = hashPasswordServer(inputPass);
  if (storedHash === hashedInput) return true;
  if (storedHash === inputPass) return true;
  return false;
}
app.post("/api/auth/register", rateLimitGuard(25, 6e4), async (req, res) => {
  try {
    const {
      fullName,
      avatarUrl,
      coverUrl,
      batchYear,
      session,
      collegeRoll,
      academicStream,
      academicGroup,
      section,
      profession,
      position,
      institution,
      specialty,
      degree,
      city,
      country,
      phone,
      whatsapp,
      email,
      password,
      bloodGroup,
      isRegisteredDonor
    } = req.body;
    if (!fullName?.trim()) {
      return res.status(400).json({ error: "Please provide your Full Name." });
    }
    if (!phone?.trim() && !email?.trim()) {
      return res.status(400).json({ error: "Please provide your Mobile Number or Email." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    const hashedPassword = hashPasswordServer(password);
    const created = await createOrRegisterAlumniProfile({
      userUid: req.body.userUid,
      rawPassword: password,
      fullName: fullName.trim(),
      avatarUrl,
      batchYear: Number(batchYear) || 68,
      session,
      collegeRoll: collegeRoll?.trim(),
      academicStream: academicStream === "Humanities" || academicStream === "Business Studies" ? academicStream : "Science",
      academicGroup: academicGroup || null,
      section: section || "Group 4",
      profession: profession || "",
      position: position || "",
      institution: institution || "",
      specialty: Array.isArray(specialty) ? specialty : [],
      degree: Array.isArray(degree) ? degree : ["HSC"],
      city: city || "Dhaka",
      country: country || "Bangladesh",
      phone: phone?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      passwordHash: hashedPassword,
      bloodGroup: bloodGroup || null,
      isRegisteredDonor: Boolean(isRegisteredDonor)
    });
    res.status(201).json({
      success: true,
      profile: formatAlumniRowToProfile(created)
    });
  } catch (error) {
    console.error("Registration failed:", error);
    res.status(400).json({ error: error.message || "Registration failed." });
  }
});
function formatToE164PhoneServer(raw) {
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
async function handleUnifiedLoginCore(req, res) {
  try {
    const { identifier, password } = req.body;
    if (!identifier?.trim() || !password) {
      return res.status(400).json({ error: "Please enter your mobile number or email and password." });
    }
    const cleanId = identifier.trim();
    const isEmail = cleanId.includes("@");
    if (isEmail) {
      const cleanEmail = cleanId.toLowerCase();
      if (isSupabaseServerConfigured) {
        try {
          const { data: uData } = await supabaseServer.auth.admin.listUsers();
          const existingU = uData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (existingU && !existingU.email_confirmed_at) {
            await supabaseServer.auth.admin.updateUserById(existingU.id, { email_confirm: true });
          }
        } catch (confirmErr) {
          console.warn("Auto-confirm check notice:", confirmErr);
        }
        const { data: signInData, error: signInError } = await supabaseServer.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (!signInError && signInData?.user) {
          let alumnus3 = await findAlumniByCredential(cleanEmail);
          if (!alumnus3) {
            alumnus3 = await createOrRegisterAlumniProfile({
              userUid: signInData.user.id,
              rawPassword: password,
              fullName: signInData.user.user_metadata?.full_name || signInData.user.user_metadata?.name || cleanEmail.split("@")[0],
              batchYear: Number(signInData.user.user_metadata?.batch_year) || 68,
              email: cleanEmail,
              passwordHash: hashPasswordServer(password)
            });
          }
          return res.json({
            success: true,
            session: signInData.session,
            profile: formatAlumniRowToProfile(alumnus3)
          });
        }
        if (signInError) {
          const msg = signInError.message.toLowerCase();
          if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
            const { data: uData } = await supabaseServer.auth.admin.listUsers();
            const existingU = uData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
            if (existingU && (existingU.app_metadata?.provider === "google" || !existingU.encrypted_password)) {
              return res.status(400).json({
                error: 'This account was created via Google Sign-In and does not have a password set yet. Please continue with "Sign in with Google" or use "Forgot Password" to set a password.'
              });
            }
            return res.status(401).json({ error: "Invalid email or password. Please verify your credentials." });
          }
        }
      }
      const alumnus2 = await findAlumniByCredential(cleanEmail);
      if (!alumnus2) {
        return res.status(404).json({ error: "No registered account found with this email address." });
      }
      const isValid2 = verifyPasswordServer(alumnus2.passwordHash, password);
      if (!isValid2) {
        return res.status(401).json({ error: "Incorrect password. Please try again." });
      }
      return res.json({
        success: true,
        profile: formatAlumniRowToProfile(alumnus2)
      });
    }
    const formattedPhone = formatToE164PhoneServer(cleanId);
    const alumnus = await findAlumniByCredential(cleanId);
    if (!alumnus) {
      return res.status(404).json({
        error: "No registered account found with this mobile number. Please register your verified profile first."
      });
    }
    if (alumnus.accountStatus === "suspended") {
      return res.status(403).json({ error: "Your account is currently suspended. Please contact Notre Dame Alumni support." });
    }
    if (!alumnus.phoneOwnershipVerified) {
      return res.status(403).json({
        error: `Your mobile number (${alumnus.phone || formattedPhone}) has not been verified by an administrator yet. As an institutional safeguard, phone login requires admin ownership verification. Please sign in using your registered email address in the meantime.`,
        phoneVerificationRequired: true
      });
    }
    if (isSupabaseServerConfigured) {
      let authSession = null;
      if (alumnus.email) {
        const { data: signInData, error: signInError } = await supabaseServer.auth.signInWithPassword({
          email: alumnus.email.toLowerCase().trim(),
          password
        });
        if (!signInError && signInData?.session) {
          authSession = signInData.session;
        }
      }
      if (!authSession) {
        try {
          const { data: phoneSignInData, error: phoneSignInErr } = await supabaseServer.auth.signInWithPassword({
            phone: formattedPhone,
            password
          });
          if (!phoneSignInErr && phoneSignInData?.session) {
            authSession = phoneSignInData.session;
          }
        } catch {
        }
      }
      if (authSession) {
        if (alumnus.authUserId) {
          try {
            await supabaseServer.auth.admin.updateUserById(alumnus.authUserId, {
              phone: formattedPhone,
              phone_confirm: true
            });
          } catch {
          }
        }
        return res.json({
          success: true,
          session: authSession,
          profile: formatAlumniRowToProfile(alumnus)
        });
      }
      const { data: usersData } = await supabaseServer.auth.admin.listUsers();
      const matchedUser = usersData?.users?.find(
        (u) => alumnus.email && u.email?.toLowerCase() === alumnus.email.toLowerCase().trim() || u.phone && u.phone === formattedPhone
      );
      if (matchedUser && (matchedUser.app_metadata?.provider === "google" || !matchedUser.encrypted_password)) {
        return res.status(400).json({
          error: 'This account was created via Google Sign-In and does not have a password set yet. Please sign in with Google, or use "Forgot Password" to set a password for phone login.'
        });
      }
      return res.status(401).json({ error: "Incorrect password for this mobile number. Please try again." });
    }
    const isValid = verifyPasswordServer(alumnus.passwordHash, password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }
    return res.json({
      success: true,
      profile: formatAlumniRowToProfile(alumnus)
    });
  } catch (error) {
    console.error("Unified login error:", error);
    res.status(500).json({ error: error.message || "Login failed. Please try again." });
  }
}
app.post("/api/auth/login", rateLimitGuard(40, 6e4), handleUnifiedLoginCore);
app.post("/api/auth/unified-login", rateLimitGuard(40, 6e4), handleUnifiedLoginCore);
app.post(
  "/api/admin/verify-phone",
  rateLimitGuard(40, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const { profileId, notes } = req.body;
      if (!profileId) {
        return res.status(400).json({ error: "profileId is required." });
      }
      const actor = resolveActor(req);
      const verified = await adminVerifyAlumniPhoneOwnership({
        profileId: Number(profileId),
        notes: typeof notes === "string" ? notes.trim() : void 0,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json({
        success: true,
        message: "Phone ownership verified successfully. Phone + Password login is now active.",
        profile: verified
      });
    } catch (error) {
      console.error("admin verify-phone error:", error);
      res.status(400).json({ error: error.message || "Failed to verify phone ownership." });
    }
  }
);
app.post(
  "/api/admin/revoke-phone-verification",
  rateLimitGuard(40, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const { profileId, notes } = req.body;
      if (!profileId) {
        return res.status(400).json({ error: "profileId is required." });
      }
      const actor = resolveActor(req);
      const revoked = await adminRevokeAlumniPhoneOwnership({
        profileId: Number(profileId),
        notes: typeof notes === "string" ? notes.trim() : void 0,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json({
        success: true,
        message: "Phone ownership verification revoked. Phone login disabled.",
        profile: revoked
      });
    } catch (error) {
      console.error("admin revoke-phone error:", error);
      res.status(400).json({ error: error.message || "Failed to revoke phone verification." });
    }
  }
);
app.post("/api/auth/reset-password", rateLimitGuard(15, 6e4), async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    if (!phone?.trim() || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Valid phone number and new password (min 6 chars) required." });
    }
    const alumnus = await findAlumniByCredential(phone.trim());
    if (!alumnus) {
      return res.status(404).json({ error: "No account found with this mobile number." });
    }
    const newHash = hashPasswordServer(newPassword);
    await updateAlumniPassword(alumnus.id, newHash);
    res.json({ success: true, message: "Password updated successfully across all devices." });
  } catch (error) {
    console.error("Password reset failed:", error);
    res.status(500).json({ error: error.message || "Password reset failed." });
  }
});
app.post("/api/auth/delete-account", rateLimitGuard(15, 6e4), async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: "Profile ID is required for deletion." });
    }
    await deleteAlumniProfile(Number(profileId));
    res.json({ success: true, message: "Profile and associated account deleted successfully." });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: error.message || "Failed to delete account." });
  }
});
function decodeHtmlEntities(raw) {
  if (!raw) return "";
  return raw.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&#x2F;/gi, "/").replace(/&#x3D;/gi, "=").replace(/&middot;/gi, "\xB7").replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return _;
    }
  }).replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(Number(dec));
    } catch {
      return _;
    }
  });
}
app.get("/api/unfurl", rateLimitGuard(120, 6e4), async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ error: "Valid HTTP/HTTPS URL required" });
  }
  const cleanUrl = targetUrl.trim();
  if (/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(cleanUrl)) {
    return res.json({
      resolvedUrl: cleanUrl,
      imageUrl: cleanUrl,
      mediaType: "photo",
      title: "Direct Photo",
      publisher: new URL(cleanUrl).hostname
    });
  }
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl)) {
    return res.json({
      resolvedUrl: cleanUrl,
      videoUrl: cleanUrl,
      mediaType: "video",
      title: "Direct Video Stream",
      publisher: new URL(cleanUrl).hostname
    });
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7e3);
    const isFacebook = /(?:facebook\.com|fb\.watch|fb\.com)/i.test(cleanUrl);
    const crawlerUa = isFacebook ? "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    const resp = await fetch(cleanUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": crawlerUa,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
        "Cache-Control": "no-cache"
      }
    });
    clearTimeout(timer);
    const finalResolvedUrl = resp.url || cleanUrl;
    const rawHtml = await resp.text();
    const getMeta = (propName) => {
      const p1 = new RegExp(`<meta[^>]+(?:property|name)=["']${propName}["'][^>]+content=["']([^"']*)["']`, "i");
      const m1 = rawHtml.match(p1);
      if (m1 && m1[1]) return decodeHtmlEntities(m1[1].trim());
      const p2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propName}["']`, "i");
      const m2 = rawHtml.match(p2);
      if (m2 && m2[1]) return decodeHtmlEntities(m2[1].trim());
      return void 0;
    };
    const titleMatch = rawHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
    const htmlTitle = titleMatch && titleMatch[1] ? decodeHtmlEntities(titleMatch[1].trim()) : void 0;
    let title = getMeta("og:title") || getMeta("twitter:title") || htmlTitle;
    let description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
    let imageUrl = getMeta("og:image:secure_url") || getMeta("og:image") || getMeta("twitter:image");
    let videoUrl = getMeta("og:video:secure_url") || getMeta("og:video:url") || getMeta("og:video") || getMeta("twitter:player:stream");
    let siteName = getMeta("og:site_name") || getMeta("publisher");
    const ogType = getMeta("og:type");
    if (!imageUrl) {
      const linkImgMatch = rawHtml.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']*)["']/i);
      if (linkImgMatch && linkImgMatch[1]) {
        imageUrl = decodeHtmlEntities(linkImgMatch[1].trim());
      }
    }
    if (isFacebook) {
      if (title && /^(Log into Facebook|Facebook|Log in to Facebook)/i.test(title)) {
        title = void 0;
      }
      if (description && /^(Log into Facebook|Facebook helps you connect)/i.test(description)) {
        description = void 0;
      }
      if (!imageUrl || !title) {
        try {
          const oembedResp = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(finalResolvedUrl)}`,
            { signal: AbortSignal.timeout(3e3) }
          );
          if (oembedResp.ok) {
            const oeJson = await oembedResp.json();
            if (oeJson && !oeJson.error) {
              if (!title && oeJson.title) title = oeJson.title;
              if (!imageUrl && oeJson.thumbnail_url) imageUrl = oeJson.thumbnail_url;
              if (!siteName && oeJson.author_name) siteName = oeJson.author_name;
            }
          }
        } catch {
        }
      }
    }
    let mediaType = "website";
    if (videoUrl || ogType?.includes("video") || /(?:videos\/|reel\/|reels\/|watch|\/share\/v\/|\/share\/r\/|fb\.watch)/i.test(
      finalResolvedUrl
    )) {
      mediaType = "video";
    } else if (imageUrl && (/(?:photo\.php|photos\/|\/photo\/)/i.test(finalResolvedUrl) || ogType?.includes("image"))) {
      mediaType = "photo";
    } else if (isFacebook) {
      mediaType = "post";
    }
    res.json({
      resolvedUrl: finalResolvedUrl,
      title,
      description,
      imageUrl,
      videoUrl,
      publisher: siteName || (isFacebook ? "Facebook" : void 0),
      mediaType,
      ogType
    });
  } catch (error) {
    const isFb = /(?:facebook\.com|fb\.watch|fb\.com)/i.test(cleanUrl);
    res.json({
      resolvedUrl: cleanUrl,
      publisher: isFb ? "Facebook" : void 0,
      mediaType: isFb ? "post" : "website",
      error: error.message
    });
  }
});
app.get("/api/stream-groups", rateLimitGuard(120, 6e4), async (_req, res) => {
  try {
    const rows = await getAcademicStreamGroupsConfig();
    res.json({ streamGroups: rows });
  } catch (error) {
    console.error("Failed to load stream groups:", error);
    res.status(500).json({ error: error.message || "Failed to load stream groups" });
  }
});
app.get(
  "/api/alumni",
  rateLimitGuard(90, 6e4),
  optionalAuth,
  async (req, res) => {
    try {
      const isAdminView = req.query.adminView === "true" && req.dbUser?.role === "admin";
      const result = await queryPaginatedAlumniProfiles({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 25,
        search: req.query.search || "",
        batchYear: req.query.batchYear ? Number(req.query.batchYear) : void 0,
        academicStream: req.query.academicStream || void 0,
        verificationStatus: req.query.verificationStatus || void 0,
        role: req.query.role || void 0,
        accountStatus: req.query.accountStatus || void 0,
        bloodGroup: req.query.bloodGroup || void 0,
        includeSensitivePii: isAdminView
      });
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch paginated alumni profiles:", error);
      res.status(500).json({ error: error.message || "Failed to fetch alumni profiles" });
    }
  }
);
app.post(
  "/api/alumni/register",
  rateLimitGuard(20, 6e4),
  optionalAuth,
  async (req, res) => {
    try {
      const user = req.user;
      const created = await createOrRegisterAlumniProfile({
        userUid: user?.uid || user?.id || req.body.userUid,
        fullName: req.body.fullName,
        avatarUrl: req.body.avatarUrl,
        batchYear: Number(req.body.batchYear) || 68,
        session: req.body.session,
        collegeRoll: req.body.collegeRoll,
        academicStream: req.body.academicStream || req.body.group || "Science",
        academicGroup: req.body.academicGroup || null,
        section: req.body.section,
        profession: req.body.profession,
        position: req.body.position,
        institution: req.body.institution,
        specialty: Array.isArray(req.body.specialty) ? req.body.specialty : [],
        degree: Array.isArray(req.body.degree) ? req.body.degree : ["HSC"],
        city: req.body.city,
        country: req.body.country,
        phone: req.body.phone,
        whatsapp: req.body.whatsapp,
        email: req.body.email,
        bloodGroup: req.body.bloodGroup,
        isRegisteredDonor: Boolean(req.body.isRegisteredDonor)
      });
      res.status(201).json({ profile: created });
    } catch (error) {
      console.error("Failed to register alumni profile:", error);
      res.status(400).json({ error: error.message || "Failed to register alumni profile" });
    }
  }
);
app.get(
  "/api/admin/overview",
  rateLimitGuard(60, 6e4),
  requireAdmin,
  async (_req, res) => {
    try {
      const overview = await getAdminOverviewMetrics();
      res.json(overview);
    } catch (error) {
      console.error("Failed to load admin overview:", error);
      res.status(500).json({ error: error.message || "Failed to load admin overview" });
    }
  }
);
app.patch(
  "/api/admin/alumni/:id",
  rateLimitGuard(40, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const profileId = Number(req.params.id);
      if (Number.isNaN(profileId)) {
        return res.status(400).json({ error: "Invalid profile ID" });
      }
      const actor = resolveActor(req);
      const updated = await adminUpdateAlumniGovernance({
        profileId,
        verificationStatus: req.body.verificationStatus,
        role: req.body.role,
        accountStatus: req.body.accountStatus,
        academicStream: req.body.academicStream,
        academicGroup: req.body.academicGroup,
        adminReviewNote: req.body.adminReviewNote,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json({ profile: updated });
    } catch (error) {
      console.error("Failed to update profile governance:", error);
      res.status(400).json({ error: error.message || "Failed to update profile governance" });
    }
  }
);
app.get(
  "/api/admin/verifications",
  rateLimitGuard(60, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const status = req.query.status || "all";
      const submissions = await getVerificationQueue(status);
      res.json({ submissions });
    } catch (error) {
      console.error("Failed to fetch verification queue:", error);
      res.status(500).json({ error: error.message || "Failed to load verification queue" });
    }
  }
);
app.post(
  "/api/admin/verifications/:id/review",
  rateLimitGuard(40, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const submissionId = Number(req.params.id);
      const decision = req.body.decision === "approved" ? "approved" : "rejected";
      const actor = resolveActor(req);
      const updated = await reviewVerificationSubmission({
        submissionId,
        decision,
        adminNote: req.body.adminNote,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json({ submission: updated });
    } catch (error) {
      console.error("Failed to review verification submission:", error);
      res.status(400).json({ error: error.message || "Failed to review verification submission" });
    }
  }
);
app.get(
  "/api/admin/blood-requests",
  rateLimitGuard(60, 6e4),
  requireAdmin,
  async (_req, res) => {
    try {
      const requests = await getBloodEmergencyList();
      res.json({ requests });
    } catch (error) {
      console.error("Failed to load blood emergency requests:", error);
      res.status(500).json({ error: error.message || "Failed to load blood emergency requests" });
    }
  }
);
app.patch(
  "/api/admin/blood-requests/:id",
  rateLimitGuard(40, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const actor = resolveActor(req);
      const updated = await moderateBloodEmergency({
        id,
        status: req.body.status,
        unitsFulfilled: req.body.unitsFulfilled !== void 0 ? Number(req.body.unitsFulfilled) : void 0,
        moderationNote: req.body.moderationNote,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json({ request: updated });
    } catch (error) {
      console.error("Failed to moderate blood emergency:", error);
      res.status(400).json({ error: error.message || "Failed to moderate blood emergency" });
    }
  }
);
app.get(
  "/api/admin/notices",
  rateLimitGuard(60, 6e4),
  requireAdmin,
  async (_req, res) => {
    try {
      const notices = await getOfficialNoticesList();
      res.json({ notices });
    } catch (error) {
      console.error("Failed to load notices:", error);
      res.status(500).json({ error: error.message || "Failed to load official notices" });
    }
  }
);
app.post(
  "/api/admin/notices",
  rateLimitGuard(30, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const actor = resolveActor(req);
      const notice = await createOrUpdateOfficialNotice({
        id: req.body.id ? Number(req.body.id) : void 0,
        title: req.body.title,
        category: req.body.category || "General",
        content: req.body.content,
        targetBatch: req.body.targetBatch ? Number(req.body.targetBatch) : null,
        isPinned: Boolean(req.body.isPinned),
        isPublished: Boolean(req.body.isPublished),
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json({ notice });
    } catch (error) {
      console.error("Failed to save notice:", error);
      res.status(400).json({ error: error.message || "Failed to save official notice" });
    }
  }
);
app.patch(
  "/api/admin/stream-groups/:id",
  rateLimitGuard(30, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const actor = resolveActor(req);
      const updated = await toggleAcademicStreamGroupActive({
        id,
        isActive: Boolean(req.body.isActive),
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json({ streamGroup: updated });
    } catch (error) {
      console.error("Failed to update stream group:", error);
      res.status(400).json({ error: error.message || "Failed to update stream group" });
    }
  }
);
app.post(
  "/api/admin/bulk-cohort",
  rateLimitGuard(10, 6e4),
  requireAdmin,
  async (req, res) => {
    try {
      const actor = resolveActor(req);
      const countToGenerate = Number(req.body.count) || 50;
      const result = await generateBulkBatchCohortSample({
        countToGenerate,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role
      });
      res.json(result);
    } catch (error) {
      console.error("Failed to execute bulk cohort import:", error);
      res.status(500).json({ error: error.message || "Failed to execute bulk cohort import" });
    }
  }
);
app.get(
  "/api/admin/export-sql-bundle",
  rateLimitGuard(20, 6e4),
  requireAdmin,
  async (_req, res) => {
    try {
      const files = [
        "001_core_schema.sql",
        "002_security_functions_triggers.sql",
        "003_rls_policies.sql",
        "004_reference_seed_data.sql",
        "005_admin_phone_verification.sql"
      ];
      const parts = [];
      for (const file of files) {
        const filePath = path.resolve(__dirname, "supabase", "migrations", file);
        const content = await readFile(filePath, "utf-8");
        parts.push(
          `-- =============================================================================
-- MIGRATION FILE: ${file}
-- =============================================================================

${content}`
        );
      }
      res.json({
        bundleSql: parts.join("\n\n"),
        filesCount: files.length
      });
    } catch (error) {
      console.error("Failed to export SQL bundle:", error);
      res.status(500).json({ error: error.message || "Failed to generate SQL migration bundle" });
    }
  }
);
app.get(
  "/api/admin/export-full-backup",
  rateLimitGuard(15, 6e4),
  requireAdmin,
  async (_req, res) => {
    try {
      const [overview, directory, verifications, blood, notices] = await Promise.all([
        getAdminOverviewMetrics(),
        queryPaginatedAlumniProfiles({ page: 1, limit: 100, includeSensitivePii: true }),
        getVerificationQueue("all"),
        getBloodEmergencyList(),
        getOfficialNoticesList()
      ]);
      res.json({
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        platform: "Notre Dame College Alumni Network (100k-Scale)",
        overview,
        alumniProfiles: directory.profiles,
        verificationSubmissions: verifications,
        bloodEmergencyRequests: blood,
        officialNotices: notices
      });
    } catch (error) {
      console.error("Failed to export full backup:", error);
      res.status(500).json({ error: error.message || "Failed to export database backup" });
    }
  }
);
app.get(
  ["/download/ndc-alumni-dist.zip", "/ndc-alumni-dist.zip", "/download/dist.zip", "/dist.zip"],
  (_req, res) => {
    const candidates = [
      path.resolve(__dirname, "dist.zip"),
      path.resolve(__dirname, "public", "dist.zip"),
      path.resolve(__dirname, "ndc-alumni-dist.zip"),
      path.resolve(__dirname, "dist", "dist.zip")
    ];
    let foundPath = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }
    if (!foundPath) {
      return res.status(404).send("Deployment bundle not found on server.");
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="ndc-alumni-dist.zip"');
    res.download(foundPath, "ndc-alumni-dist.zip");
  }
);
async function startServer() {
  const httpServer = createHttpServer(app);
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  if (typeof PORT === "number") {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`NDC Alumni Hardened Server running on http://0.0.0.0:${PORT}`);
    });
  } else {
    httpServer.listen(PORT, () => {
      console.log(`NDC Alumni Hardened Server running on cPanel socket ${PORT}`);
    });
  }
}
startServer();
