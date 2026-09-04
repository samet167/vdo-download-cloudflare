/**
 * js/app.js — Interactive Application Logic
 * ===========================================
 * Handles URL parsing, platform detection, video preview & format download.
 */

document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("video-url-input");
  const fetchBtn = document.getElementById("btn-fetch");
  const clearBtn = document.getElementById("btn-clear");
  const resultSection = document.getElementById("result-section");
  const errorBanner = document.getElementById("error-banner");
  const platformTabs = document.querySelectorAll(".platform-btn");

  let currentVideoData = null;
  let selectedFormat = null;

  // ── 1. Detect Platform from URL ──────────────────────────────────────────
  function detectPlatform(url) {
    const u = (url || "").toLowerCase();
    if (u.includes("tiktok.com") || u.includes("douyin.com")) return "tiktok";
    if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "facebook";
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
    return "all";
  }

  function setActiveTab(platform) {
    platformTabs.forEach(tab => {
      if (tab.dataset.platform === platform) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });
  }

  // Input change & paste handlers
  urlInput.addEventListener("input", () => {
    const val = urlInput.value.trim();
    clearBtn.style.display = val ? "block" : "none";
    const detected = detectPlatform(val);
    setActiveTab(detected);
    hideError();
  });

  clearBtn.addEventListener("click", () => {
    urlInput.value = "";
    clearBtn.style.display = "none";
    resultSection.style.display = "none";
    hideError();
    urlInput.focus();
  });

  // Tab click handlers (change placeholder)
  platformTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const p = tab.dataset.platform;
      setActiveTab(p);
      if (p === "youtube") urlInput.placeholder = "Paste YouTube link (e.g. https://youtu.be/...)";
      else if (p === "tiktok") urlInput.placeholder = "Paste TikTok link (e.g. https://www.tiktok.com/@...)";
      else if (p === "facebook") urlInput.placeholder = "Paste Facebook video / reels link...";
      else urlInput.placeholder = "Paste YouTube, TikTok, or Facebook video link here...";
      urlInput.focus();
    });
  });

  // ── 2. Error Display Helpers ─────────────────────────────────────────────
  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = "block";
    resultSection.style.display = "none";
  }

  function hideError() {
    errorBanner.style.display = "none";
  }

  // ── 3. Fetch Video Info ──────────────────────────────────────────────────
  async function fetchVideoInfo() {
    const url = urlInput.value.trim();
    if (!url) {
      showError("Please enter a video URL.");
      urlInput.focus();
      return;
    }

    hideError();
    resultSection.style.display = "none";

    // Set Loading state
    fetchBtn.disabled = true;
    const originalBtnHtml = fetchBtn.innerHTML;
    fetchBtn.innerHTML = `
      <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Fetching...</span>
    `;

    try {
      const apiEndpoint = `${window.CONFIG.API_BASE}/api/info`;
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ url: url })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to extract video information.");
      }

      currentVideoData = data;
      renderVideoResult(data);
    } catch (err) {
      console.error("Fetch error:", err);
      showError(err.message || "Network error. Please check the URL and try again.");
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.innerHTML = originalBtnHtml;
    }
  }

  // ── 4. Render Video Result Card ──────────────────────────────────────────
  function renderVideoResult(data) {
    const thumbImg = document.getElementById("res-thumb");
    const titleEl = document.getElementById("res-title");
    const uploaderEl = document.getElementById("res-uploader");
    const durationEl = document.getElementById("res-duration");
    const formatsContainer = document.getElementById("res-formats");
    const embedEl = document.getElementById("res-embed-downloader");

    thumbImg.src = data.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400";
    thumbImg.alt = data.title;
    titleEl.textContent = data.title || "Video";
    uploaderEl.textContent = `By ${data.uploader || "Creator"}`;
    
    if (data.duration_str) {
      durationEl.textContent = data.duration_str;
      durationEl.style.display = "inline-block";
    } else {
      durationEl.style.display = "none";
    }

    // Populate format selection pills
    formatsContainer.innerHTML = "";
    const formats = data.formats || [];

    if (formats.length === 0) {
      showError("No downloadable stream found for this video.");
      return;
    }

    selectedFormat = formats[0];

    formats.forEach((fmt, idx) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = `format-pill ${idx === 0 ? "active" : ""}`;
      pill.textContent = fmt.quality || `${fmt.resolution} ${fmt.ext.toUpperCase()}`;

      pill.addEventListener("click", () => {
        document.querySelectorAll(".format-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        selectedFormat = fmt;
        updateDownloadButton(data.title);
        updateEmbedPlayer(data);
      });

      formatsContainer.appendChild(pill);
    });

    updateDownloadButton(data.title);
    updateEmbedPlayer(data);
    resultSection.style.display = "block";
  }

  function updateEmbedPlayer(data) {
    const embedEl = document.getElementById("res-embed-downloader");
    if (!embedEl) return;
    
    if (data.platform === "youtube" && data.video_id) {
      const fType = (selectedFormat && selectedFormat.ext === "mp3") ? "mp3" : "mp4";
      embedEl.innerHTML = `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; text-align: center;">
          <p style="font-size: 0.85rem; color: #a1a1aa; margin-bottom: 8px;">⚡ 1-Click Direct In-Page Downloader (${fType.toUpperCase()}):</p>
          <iframe src="https://p.savenow.to/api/button/?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${data.video_id}&f=${fType}" width="100%" height="60" scrolling="no" style="border:none; border-radius:8px; overflow:hidden;"></iframe>
        </div>
      `;
      embedEl.style.display = "block";
    } else {
      embedEl.style.display = "none";
      embedEl.innerHTML = "";
    }
  }

  function updateDownloadButton(title) {
    const downloadBtn = document.getElementById("res-download-btn");
    if (!selectedFormat) return;

    const safeTitle = (title || "video").replace(/[^\w\s-]/gi, "").trim().replace(/\s+/g, "_");
    const filename = `${safeTitle}.${selectedFormat.ext || "mp4"}`;

    if (selectedFormat.isDirectStream !== false && selectedFormat.url.startsWith("http")) {
      // Direct CDN video stream (TikTok / Facebook) -> Route through attachment proxy
      const downloadUrl = `${window.CONFIG.API_BASE}/api/download?url=${encodeURIComponent(selectedFormat.url)}&filename=${encodeURIComponent(filename)}`;
      downloadBtn.href = downloadUrl;
      downloadBtn.setAttribute("download", filename);
    } else {
      // Direct converter URL (YouTube) -> Direct click
      downloadBtn.href = selectedFormat.url;
      downloadBtn.removeAttribute("download");
    }

    downloadBtn.target = "_blank";
    downloadBtn.rel = "noopener noreferrer";
    downloadBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
      <span>Download ${selectedFormat.quality || selectedFormat.resolution}</span>
    `;
  }

  // ── 5. Form Submit Listener ──────────────────────────────────────────────
  fetchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    fetchVideoInfo();
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchVideoInfo();
    }
  });
});
