/**
 * extractors/tiktok.js — TikTok Video Extractor
 * ===============================================
 * Resolves TikTok video without watermark & MP3 audio stream.
 */

export async function extractTikTok(url) {
  const cleanUrl = url.trim();

  // 1. Try TikWM API
  try {
    const res = await fetch("https://www.tikwm.com/api/?url=" + encodeURIComponent(cleanUrl), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const json = await res.json();
      if (json.code === 0 && json.data) {
        const d = json.data;
        const formats = [];

        // HD No Watermark
        if (d.hdplay) {
          formats.push({
            format_id: "hd",
            quality: "1080p Full HD (No Watermark)",
            resolution: "1080x1920",
            ext: "mp4",
            url: d.hdplay,
            filesize: d.hd_size || null,
            note: "Fastest / Best Quality"
          });
        }

        // Standard No Watermark
        if (d.play) {
          formats.push({
            format_id: "sd",
            quality: "720p HD (No Watermark)",
            resolution: "720x1280",
            ext: "mp4",
            url: d.play,
            filesize: d.size || null,
            note: "Standard Quality"
          });
        }

        // Watermarked (if needed)
        if (d.wmplay) {
          formats.push({
            format_id: "wm",
            quality: "Watermarked Video",
            resolution: "720x1280",
            ext: "mp4",
            url: d.wmplay,
            filesize: d.wm_size || null,
            note: "With TikTok Watermark"
          });
        }

        // Audio MP3
        if (d.music) {
          formats.push({
            format_id: "audio",
            quality: "Audio MP3 (Original Sound)",
            resolution: "Audio",
            ext: "mp3",
            url: d.music,
            note: d.music_info?.title || "Original Audio"
          });
        }

        return {
          success: true,
          platform: "tiktok",
          title: d.title || "TikTok Video",
          uploader: d.author?.nickname || d.author?.unique_id || "TikTok Creator",
          uploader_id: d.author?.unique_id || "",
          thumbnail: d.cover || d.origin_cover || "",
          duration: d.duration || 0,
          duration_str: d.duration ? `${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, "0")}` : null,
          formats: formats
        };
      }
    }
  } catch (err) {
    console.error("TikWM API error:", err);
  }

  // 2. Fallback: TikMate API
  try {
    const formData = new URLSearchParams();
    formData.append("url", cleanUrl);

    const res2 = await fetch("https://api.tikmate.app/api/lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      body: formData.toString()
    });

    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.success && data2.id) {
        const videoToken = data2.token;
        const videoId = data2.id;
        const directUrl = `https://tikmate.app/download/${videoToken}/${videoId}.mp4?hd=1`;

        return {
          success: true,
          platform: "tiktok",
          title: data2.author_name ? `${data2.author_name}'s TikTok` : "TikTok Video",
          uploader: data2.author_name || "TikTok Creator",
          uploader_id: data2.author_id || "",
          thumbnail: `https://tikmate.app/thumbnail/${videoId}.jpg`,
          duration: 0,
          formats: [
            {
              format_id: "hd",
              quality: "HD Video (No Watermark)",
              resolution: "1080x1920",
              ext: "mp4",
              url: directUrl,
              note: "TikMate HD"
            }
          ]
        };
      }
    }
  } catch (err) {
    console.error("TikMate fallback error:", err);
  }

  throw new Error("Unable to extract TikTok video. Please ensure the link is public and valid.");
}
