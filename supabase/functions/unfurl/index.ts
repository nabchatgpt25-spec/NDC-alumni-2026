// =============================================================================
// SUPABASE EDGE FUNCTION: unfurl
// Project: Notre Dame College Alumni Network (NDC Dhaka)
// Runtime: Deno (Supabase Edge Runtime)
// Description: Secure, SSRF-hardened rich link unfurl and OpenGraph crawler
//              proxy for Facebook, YouTube, media streams, and web links.
// =============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// -----------------------------------------------------------------------------
// SSRF (Server-Side Request Forgery) DEFENSE
// -----------------------------------------------------------------------------
function isPrivateOrLocalIp(ip: string): boolean {
  // IPv4 checks
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, a, b, c, d] = ipv4Match.map(Number);
    if (a === 127) return true; // 127.0.0.0/8 Loopback
    if (a === 10) return true; // 10.0.0.0/8 Private
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 Private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 Private
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-Local / Cloud Metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 Carrier-grade NAT
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // Multicast / Reserved
  }

  // IPv6 checks
  const lowerIp = ip.toLowerCase();
  if (
    lowerIp === "::1" ||
    lowerIp === "::" ||
    lowerIp.startsWith("fe80:") ||
    lowerIp.startsWith("fc") ||
    lowerIp.startsWith("fd") ||
    lowerIp.includes("::ffff:127.") ||
    lowerIp.includes("::ffff:10.") ||
    lowerIp.includes("::ffff:192.168.")
  ) {
    return true;
  }

  return false;
}

function isSafeTargetUrl(rawUrl: string): { safe: boolean; error?: string; parsed?: URL } {
  try {
    const parsed = new URL(rawUrl);

    // 1. Enforce HTTP / HTTPS protocol only
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: "Only HTTP and HTTPS protocols are permitted." };
    }

    const host = parsed.hostname.toLowerCase();

    // 2. Reject localhost & loopback domain representations
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "metadata.google.internal" ||
      host.includes("metadata.google")
    ) {
      return { safe: false, error: "Access to internal networks or localhost is blocked." };
    }

    // 3. Reject direct private IP hosts
    if (isPrivateOrLocalIp(host)) {
      return { safe: false, error: "Access to private or non-routable IP addresses is prohibited." };
    }

    // 4. Reject usernames/passwords in URLs
    if (parsed.username || parsed.password) {
      return { safe: false, error: "URLs with credentials are prohibited." };
    }

    // 5. Reject non-standard ports commonly used for internal services
    if (parsed.port && !["80", "443", "8080", "8443"].includes(parsed.port)) {
      return { safe: false, error: "Non-standard network port disallowed." };
    }

    return { safe: true, parsed };
  } catch {
    return { safe: false, error: "Malformed URL format." };
  }
}

// Perform active DNS resolution to block DNS rebinding attacks to internal IPs
async function validateHostDns(hostname: string): Promise<{ safe: boolean; error?: string }> {
  const cleanHost = hostname.toLowerCase().trim();

  // If host is an IP address string directly
  if (isPrivateOrLocalIp(cleanHost)) {
    return { safe: false, error: "Access to private or non-routable IP addresses is prohibited." };
  }

  // If host is a raw IPv4 or IPv6, it already passed isPrivateOrLocalIp
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes(":")) {
    return { safe: true };
  }

  // Resolve IPv4 addresses via Deno.resolveDns
  try {
    const aRecords = await Deno.resolveDns(cleanHost, "A");
    if (aRecords && Array.isArray(aRecords)) {
      for (const ip of aRecords) {
        if (isPrivateOrLocalIp(ip)) {
          return { safe: false, error: `Destination domain resolves to protected internal IP (${ip}). Request blocked.` };
        }
      }
    }
  } catch {
    // DNS A query notice
  }

  // Resolve IPv6 addresses via Deno.resolveDns
  try {
    const aaaaRecords = await Deno.resolveDns(cleanHost, "AAAA");
    if (aaaaRecords && Array.isArray(aaaaRecords)) {
      for (const ip of aaaaRecords) {
        if (isPrivateOrLocalIp(ip)) {
          return { safe: false, error: `Destination domain resolves to protected internal IPv6 (${ip}). Request blocked.` };
        }
      }
    }
  } catch {
    // DNS AAAA query notice
  }

  return { safe: true };
}

// HTML Entity Decoder
function decodeHtml(raw: string): string {
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

// -----------------------------------------------------------------------------
// SECURE FETCH WITH REDIRECT VALIDATION & SIZE LIMIT
// -----------------------------------------------------------------------------
const MAX_HTML_BYTES = 512 * 1024; // 512 KB maximum buffer

async function safeFetchHtml(targetUrl: string, userAgent: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = targetUrl;
  let redirectsRemaining = 4;

  while (redirectsRemaining >= 0) {
    const safety = isSafeTargetUrl(currentUrl);
    if (!safety.safe || !safety.parsed) {
      throw new Error(safety.error || "Redirect to prohibited destination blocked.");
    }

    // Active DNS resolution validation prevents DNS rebinding to internal IPs
    const dnsSafety = await validateHostDns(safety.parsed.hostname);
    if (!dnsSafety.safe) {
      throw new Error(dnsSafety.error || "Destination resolves to unauthorized internal IP address.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual", // Manual redirect validation prevents SSRF via 301/302 redirects
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
          "Cache-Control": "no-cache",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    // Handle redirects
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      redirectsRemaining--;
      const location = res.headers.get("Location");
      if (!location) {
        throw new Error("Redirect response missing Location header.");
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!res.ok) {
      throw new Error(`Upstream server returned HTTP ${res.status}`);
    }

    // Read response body with strict byte ceiling
    const reader = res.body?.getReader();
    if (!reader) return { html: "", finalUrl: currentUrl };

    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
        chunks.push(value);
        if (receivedBytes > MAX_HTML_BYTES) {
          reader.cancel();
          break;
        }
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });
    return {
      html: decoder.decode(totalBuffer),
      finalUrl: currentUrl,
    };
  }

  throw new Error("Too many redirects encountered.");
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url") || (await req.json().catch(() => ({})))?.url;

  if (!targetUrl || typeof targetUrl !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing or invalid url parameter." }),
      { status: 400, headers: corsHeaders }
    );
  }

  const cleanTarget = targetUrl.trim();
  const validation = isSafeTargetUrl(cleanTarget);
  if (!validation.safe) {
    return new Response(
      JSON.stringify({ error: validation.error || "Prohibited target URL." }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Handle direct media files immediately
  if (/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(cleanTarget)) {
    return new Response(
      JSON.stringify({
        resolvedUrl: cleanTarget,
        imageUrl: cleanTarget,
        mediaType: "photo",
        title: "Direct Photo",
        publisher: validation.parsed?.hostname,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanTarget)) {
    return new Response(
      JSON.stringify({
        resolvedUrl: cleanTarget,
        videoUrl: cleanTarget,
        mediaType: "video",
        title: "Direct Video Stream",
        publisher: validation.parsed?.hostname,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const isFacebook = /(?:facebook\.com|fb\.watch|fb\.com)/i.test(cleanTarget);
    const crawlerUa = isFacebook
      ? "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    const { html: rawHtml, finalUrl } = await safeFetchHtml(cleanTarget, crawlerUa);

    const getMeta = (propName: string): string | undefined => {
      const p1 = new RegExp(`<meta[^>]+(?:property|name)=["']${propName}["'][^>]+content=["']([^"']*)["']`, "i");
      const m1 = rawHtml.match(p1);
      if (m1 && m1[1]) return decodeHtml(m1[1].trim());

      const p2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propName}["']`, "i");
      const m2 = rawHtml.match(p2);
      if (m2 && m2[1]) return decodeHtml(m2[1].trim());

      return undefined;
    };

    const titleMatch = rawHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
    const htmlTitle = titleMatch && titleMatch[1] ? decodeHtml(titleMatch[1].trim()) : undefined;

    let title = getMeta("og:title") || getMeta("twitter:title") || htmlTitle;
    let description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
    let imageUrl =
      getMeta("og:image:secure_url") ||
      getMeta("og:image") ||
      getMeta("twitter:image");
    let videoUrl =
      getMeta("og:video:secure_url") ||
      getMeta("og:video:url") ||
      getMeta("og:video") ||
      getMeta("twitter:player:stream");
    let siteName = getMeta("og:site_name") || getMeta("publisher");
    const ogType = getMeta("og:type");

    if (!imageUrl) {
      const linkImgMatch = rawHtml.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']*)["']/i);
      if (linkImgMatch && linkImgMatch[1]) {
        imageUrl = decodeHtml(linkImgMatch[1].trim());
      }
    }

    if (isFacebook) {
      if (title && /^(Log into Facebook|Facebook|Log in to Facebook)/i.test(title)) {
        title = undefined;
      }
      if (description && /^(Log into Facebook|Facebook helps you connect)/i.test(description)) {
        description = undefined;
      }

      // If Facebook direct scrape was thin, try noembed public provider
      if (!imageUrl || !title) {
        try {
          const oeRes = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(finalUrl)}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (oeRes.ok) {
            const oeJson = await oeRes.json();
            if (oeJson && !oeJson.error) {
              if (!title && oeJson.title) title = oeJson.title;
              if (!imageUrl && oeJson.thumbnail_url) imageUrl = oeJson.thumbnail_url;
              if (!siteName && oeJson.author_name) siteName = oeJson.author_name;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    let mediaType: "photo" | "video" | "post" | "article" | "website" = "website";
    if (
      videoUrl ||
      ogType?.includes("video") ||
      /(?:videos\/|reel\/|reels\/|watch|\/share\/v\/|\/share\/r\/|fb\.watch)/i.test(finalUrl)
    ) {
      mediaType = "video";
    } else if (
      imageUrl &&
      (/(?:photo\.php|photos\/|\/photo\/)/i.test(finalUrl) || ogType?.includes("image"))
    ) {
      mediaType = "photo";
    } else if (isFacebook) {
      mediaType = "post";
    }

    return new Response(
      JSON.stringify({
        resolvedUrl: finalUrl,
        title,
        description,
        imageUrl,
        videoUrl,
        publisher: siteName || (isFacebook ? "Facebook" : undefined),
        mediaType,
        ogType,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    const isFb = /(?:facebook\.com|fb\.watch|fb\.com)/i.test(cleanTarget);
    return new Response(
      JSON.stringify({
        resolvedUrl: cleanTarget,
        publisher: isFb ? "Facebook" : undefined,
        mediaType: isFb ? "post" : "website",
        error: err?.message || "Failed to unfurl link.",
      }),
      { status: 200, headers: corsHeaders }
    );
  }
});
