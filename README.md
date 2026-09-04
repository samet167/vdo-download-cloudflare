# ⚡ Cloudflare Video Downloader (100% Serverless)

A modern, high-speed multi-platform video downloader built to run **100% Serverless on Cloudflare (Cloudflare Workers + Cloudflare Pages)** for free. 

- **No local server or computer required**: Runs online 24/7/365 on Cloudflare global edge.
- **Platforms Supported**:
  - **TikTok**: 1080p Full HD Video without Watermark + MP3 audio.
  - **Facebook**: Public Videos & Reels in HD/SD MP4.
  - **YouTube**: 720p/1080p MP4 & MP3 audio stream resolver.
- **Instant Browser Saving**: Injects `Content-Disposition: attachment` headers for seamless 1-click downloads.

---

## 🚀 How to Deploy to Cloudflare (Free)

### 1. Deploy the Backend API (Cloudflare Worker)
Open your terminal inside `worker/` and run:
```bash
cd worker
npx wrangler deploy
```
> This will deploy your Worker API to: `https://video-downloader-api.<your-account>.workers.dev`

### 2. Deploy the Frontend UI (Cloudflare Pages)
Update the `API_BASE` in `public/js/config.js` with your deployed Worker URL, then deploy the `public` folder:
```bash
npx wrangler pages deploy public --project-name videodown
```

---

## 🛠️ Local Testing
To test the website locally:
```bash
# Start frontend preview
npx serve public -p 8080
```
Then visit `http://localhost:8080` in your browser!
