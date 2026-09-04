/**
 * js/config.js — Frontend Configuration
 * ========================================
 * Dynamic API Base URL for Cloudflare Worker & Pages.
 */

window.CONFIG = {
  // Cloudflare Worker API URL
  API_BASE: (function() {
    // If custom API_BASE defined in window.ENV
    if (typeof window !== "undefined" && window.ENV && window.ENV.API_BASE) {
      return window.ENV.API_BASE.replace(/\/+$/, "");
    }
    // Local development
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return "http://127.0.0.1:8787";
    }
    // If hosted on custom domain or Worker directly
    if (typeof window !== "undefined" && window.location.hostname.includes("workers.dev")) {
      return window.location.origin;
    }
    // Default Cloudflare Worker URL (Active & Deployed)
    return "https://yt-proxy.samet-dev.workers.dev";
  })()
};
