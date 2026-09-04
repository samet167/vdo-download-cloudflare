/**
 * worker/worker.js — 100% Serverless Cloudflare Video Downloader Worker
 * ======================================================================
 * Runs on Cloudflare's global edge network (Free 100,000 requests/day).
 * Handles video metadata extraction & direct file download streaming.
 */

import { extractTikTok } from "./extractors/tiktok.js";
import { extractFacebook } from "./extractors/facebook.js";
import { extractYouTube } from "./extractors/youtube.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS
    }
  });
}

function detectPlatform(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("tiktok.com") || u.includes("douyin.com")) return "tiktok";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "facebook";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "generic";
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. Health check
    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health") {
      return jsonResponse({
        status: "ok",
        service: "cloudflare-video-downloader-api",
        platforms: ["youtube", "tiktok", "facebook"],
        version: "1.0.0"
      });
    }

    // 3. Extraction Endpoint (/api/info)
    if (url.pathname === "/api/info" && request.method === "POST") {
      try {
        const body = await request.json();
        const videoUrl = body.url || body.videoUrl;

        if (!videoUrl || typeof videoUrl !== "string") {
          return jsonResponse({ error: "Missing or invalid 'url' parameter" }, 400);
        }

        const platform = detectPlatform(videoUrl);
        let result = null;

        if (platform === "tiktok") {
          result = await extractTikTok(videoUrl);
        } else if (platform === "facebook") {
          result = await extractFacebook(videoUrl);
        } else if (platform === "youtube") {
          result = await extractYouTube(videoUrl);
        } else {
          // Attempt generic / YouTube fallback
          try {
            result = await extractYouTube(videoUrl);
          } catch {
            return jsonResponse({
              error: "Unsupported URL. Please enter a valid YouTube, TikTok, or Facebook video link."
            }, 422);
          }
        }

        return jsonResponse(result);
      } catch (err) {
        return jsonResponse({
          error: err.message || "Failed to extract video details",
          success: false
        }, 422);
      }
    }

    // 4. Download Stream Proxy Endpoint (/api/download)
    // Injects attachment header so browser instantly downloads the video file
    if (url.pathname === "/api/download" && request.method === "GET") {
      const targetUrl = url.searchParams.get("url");
      const filename = url.searchParams.get("filename") || "video.mp4";

      if (!targetUrl) {
        return jsonResponse({ error: "Missing 'url' parameter" }, 400);
      }

      try {
        const upstreamResponse = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Referer": targetUrl
          }
        });

        if (!upstreamResponse.ok) {
          // If upstream proxy fails, redirect user directly to download stream
          return Response.redirect(targetUrl, 302);
        }

        const responseHeaders = new Headers(upstreamResponse.headers);
        responseHeaders.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        responseHeaders.delete("content-security-policy");

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: responseHeaders
        });
      } catch (err) {
        // Fallback: Redirect directly
        return Response.redirect(targetUrl, 302);
      }
    }

    return jsonResponse({ error: "Endpoint not found" }, 404);
  }
};
