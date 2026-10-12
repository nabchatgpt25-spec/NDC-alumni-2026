// =============================================================================
// SUPABASE EDGE FUNCTION: link-preview
// Project: NDC Alumni 2026
// Runtime: Deno (Supabase Edge Runtime)
// Description: SSRF-safe universal link preview & OpenGraph metadata extractor
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// -----------------------------------------------------------------------------
// SSRF (Server-Side Request Forgery) Validation
// Reject localhost, 127.*, 10.*, 172.16-31.*, 192.168.*, 169.254.*, ::1, fc00::/7
// -----------------------------------------------------------------------------
function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") {
    return true;
  }

  // IPv4 Checks
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [_, a, b] = ipv4.map(Number);
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link Local / Cloud Metadata)
    if (a === 0) return true; // 0.0.0.0/8
  }

  // IPv6 Checks
  if (
    host === "::1" ||
    host === "[::1]" ||
    host === "::" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc00:") ||
    host.startsWith("fd") ||
    host.startsWith("fc") ||
    host.includes("::ffff:127.") ||
    host.includes("::ffff:10.") ||
    host.includes("::ffff:192.168.")
  ) {
    return true;
  }

  return false;
}

function decodeHtmlEntities(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x3D;/gi, "=")
    .replace(/&middot;/gi, "·")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return _;
      }
    });
}

function detectPlatformType(finalUrl: string): {
  type:
    | "youtube"
    | "facebook_video"
    | "facebook_post"
    | "instagram"
    | "tiktok"
    | "twitter"
    | "vimeo"
    | "generic";
  video_id?: string;
  code?: string;
} {
  try {
    const parsed = new URL(finalUrl);
    const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.|web\.)/, "");
    const pathname = parsed.pathname;

    // 1. YouTube
    if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
      let videoId: string | undefined;
      if (host === "youtu.be") {
        videoId = pathname.slice(1).split("/")[0]?.split("?")[0];
      } else if (pathname.startsWith("/shorts/")) {
        videoId = pathname.replace(/^\/shorts\//, "").split("/")[0]?.split("?")[0];
      } else if (pathname.startsWith("/embed/")) {
        videoId = pathname.replace(/^\/embed\//, "").split("/")[0]?.split("?")[0];
      } else if (pathname.startsWith("/live/")) {
        videoId = pathname.replace(/^\/live\//, "").split("/")[0]?.split("?")[0];
      } else if (parsed.searchParams.has("v")) {
        videoId = parsed.searchParams.get("v") || undefined;
      }
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return { type: "youtube", video_id: videoId };
      }
      if (videoId) {
        return { type: "youtube", video_id: videoId };
      }
    }

    // 2. Facebook
    if (host === "facebook.com" || host === "fb.com" || host === "fb.watch" || host.endsWith(".facebook.com")) {
      const lower = finalUrl.toLowerCase();
      if (
        lower.includes("/videos/") ||
        lower.includes("/watch") ||
        lower.includes("/reel/") ||
        lower.includes("/share/v/") ||
        lower.includes("/share/r/") ||
        host === "fb.watch"
      ) {
        return { type: "facebook_video" };
      }
      return { type: "facebook_post" };
    }

    // 3. Instagram (/p/{c}, /reel/{c}, /tv/{c})
    if (host === "instagram.com" || host.endsWith(".instagram.com")) {
      const igMatch = pathname.match(/\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
      if (igMatch && igMatch[1]) {
        return { type: "instagram", code: igMatch[1] };
      }
    }

    // 4. TikTok (/video/{id})
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      const ttMatch = pathname.match(/\/video\/(\d+)/);
      if (ttMatch && ttMatch[1]) {
        return { type: "tiktok", video_id: ttMatch[1] };
      }
    }

    // 5. Twitter / X (/status/{id})
    if (host === "twitter.com" || host === "x.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com")) {
      if (pathname.includes("/status/")) {
        return { type: "twitter" };
      }
    }

    // 6. Vimeo (/{id})
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      const vimeoMatch = pathname.match(/^\/(\d+)/);
      if (vimeoMatch && vimeoMatch[1]) {
        return { type: "vimeo", video_id: vimeoMatch[1] };
      }
    }
  } catch {
    // fallback
  }

  return { type: "generic" };
}

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed. Use POST with { url }." }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    let body: { url?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body. Expected { url: string }." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const rawUrl = body?.url?.trim();
    if (!rawUrl) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required 'url' parameter." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Protocol check: Only HTTP / HTTPS
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid URL string format." }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid protocol. Only http: and https: URLs are permitted." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // SSRF Check: Reject local/private IPs and addresses
    if (isPrivateOrLocalHost(parsedUrl.hostname)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Access to private or local network addresses is forbidden." }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Server-side fetch with redirect follow and 8s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NDCBot/1.0)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      // If direct fetch fails (e.g. timeout), still return detection from requested URL
      const detected = detectPlatformType(rawUrl);
      return new Response(
        JSON.stringify({
          ok: true,
          type: detected.type,
          canonical_url: rawUrl,
          title: parsedUrl.hostname,
          description: undefined,
          image: undefined,
          site_name: parsedUrl.hostname,
          video_id: detected.video_id,
          code: detected.code,
          warning: fetchErr.name === "AbortError" ? "Fetch timed out after 8s" : fetchErr.message,
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    clearTimeout(timeoutId);

    const finalUrl = response.url || parsedUrl.toString();

    // Verify final redirected URL for SSRF
    try {
      const finalParsed = new URL(finalUrl);
      if (isPrivateOrLocalHost(finalParsed.hostname)) {
        return new Response(
          JSON.stringify({ ok: false, error: "Redirect target violates SSRF restrictions." }),
          { status: 403, headers: corsHeaders }
        );
      }
    } catch {}

    // Read HTML (limit to 500KB to prevent memory exhaustion)
    let rawHtml = "";
    try {
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder("utf-8");
        let bytesRead = 0;
        const MAX_BYTES = 500 * 1024; // 500 KB

        while (bytesRead < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          bytesRead += value.length;
          rawHtml += decoder.decode(value, { stream: true });
        }
        rawHtml += decoder.decode();
      } else {
        const text = await response.text();
        rawHtml = text.slice(0, 500 * 1024);
      }
    } catch {
      // Continue with empty html if stream read fails
    }

    // Helper regex to extract meta tag content
    const getMeta = (propName: string): string | undefined => {
      const p1 = new RegExp(`<meta[^>]+(?:property|name)=["']${propName}["'][^>]+content=["']([^"']*)["']`, "i");
      const m1 = rawHtml.match(p1);
      if (m1 && m1[1]) return decodeHtmlEntities(m1[1].trim());

      const p2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propName}["']`, "i");
      const m2 = rawHtml.match(p2);
      if (m2 && m2[1]) return decodeHtmlEntities(m2[1].trim());

      return undefined;
    };

    // Extract OpenGraph / Twitter metadata and HTML title
    const titleMatch = rawHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
    const htmlTitle = titleMatch && titleMatch[1] ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;

    const ogTitle = getMeta("og:title") || getMeta("twitter:title") || htmlTitle;
    const ogDescription = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
    const ogImage =
      getMeta("og:image:secure_url") ||
      getMeta("og:image") ||
      getMeta("twitter:image:src") ||
      getMeta("twitter:image");
    const ogUrl = getMeta("og:url");
    const ogSiteName = getMeta("og:site_name") || getMeta("application-name");

    const canonicalUrl = ogUrl && /^https?:\/\//i.test(ogUrl) ? ogUrl : finalUrl;

    // Detect platform type from FINAL URL
    const detected = detectPlatformType(finalUrl);

    // Default site name if not present
    let defaultSiteName = ogSiteName;
    if (!defaultSiteName) {
      try {
        defaultSiteName = new URL(canonicalUrl).hostname.replace(/^www\./, "");
      } catch {
        defaultSiteName = undefined;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        type: detected.type,
        canonical_url: canonicalUrl,
        title: ogTitle || defaultSiteName,
        description: ogDescription,
        image: ogImage,
        site_name: defaultSiteName,
        video_id: detected.video_id,
        code: detected.code,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "Failed to unfurl link preview.",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
