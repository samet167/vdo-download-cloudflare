/**
 * extractors/facebook.js — Facebook Video & Reels Extractor
 * ==========================================================
 * Resolves Facebook video stream URLs (HD & SD MP4).
 */

export async function extractFacebook(url) {
  const cleanUrl = url.trim();

  // 1. Try Direct HTML/GraphQL parse via mobile user-agent
  try {
    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Mode": "navigate"
      },
      redirect: "follow"
    });

    if (res.ok) {
      const html = await res.text();
      
      // Extract title
      let title = "Facebook Video";
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/ \| Facebook$/i, "").trim();
      }

      // Extract thumbnail
      let thumbnail = "";
      const thumbMatch = html.match(/"preferred_thumbnail":\{"image":\{"uri":"([^"]+)"/i) 
        || html.match(/property="og:image" content="([^"]+)"/i);
      if (thumbMatch && thumbMatch[1]) {
        thumbnail = thumbMatch[1].replace(/\\/g, "");
      }

      // Extract HD / SD urls
      let hdUrl = null;
      let sdUrl = null;

      const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/i) 
        || html.match(/"playable_url_quality_hd":"([^"]+)"/i)
        || html.match(/hd_src:"([^"]+)"/i);
      if (hdMatch && hdMatch[1]) {
        hdUrl = hdMatch[1].replace(/\\/g, "").replace(/&amp;/g, "&");
      }

      const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/i) 
        || html.match(/"playable_url":"([^"]+)"/i)
        || html.match(/sd_src:"([^"]+)"/i);
      if (sdMatch && sdMatch[1]) {
        sdUrl = sdMatch[1].replace(/\\/g, "").replace(/&amp;/g, "&");
      }

      if (hdUrl || sdUrl) {
        const formats = [];
        if (hdUrl) {
          formats.push({
            format_id: "hd",
            quality: "720p HD Video",
            resolution: "720p",
            ext: "mp4",
            url: hdUrl,
            note: "High Definition"
          });
        }
        if (sdUrl) {
          formats.push({
            format_id: "sd",
            quality: "360p SD Video",
            resolution: "360p",
            ext: "mp4",
            url: sdUrl,
            note: "Standard Definition"
          });
        }

        return {
          success: true,
          platform: "facebook",
          title: title,
          uploader: "Facebook Creator",
          thumbnail: thumbnail,
          duration: 0,
          formats: formats
        };
      }
    }
  } catch (err) {
    console.error("Facebook direct extract error:", err);
  }

  // 2. Fallback: SnapSave / FDown API resolver
  try {
    const formData = new URLSearchParams();
    formData.append("fburl", cleanUrl);

    const res2 = await fetch("https://snapsave.app/action.php?lang=en", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      body: formData.toString()
    });

    if (res2.ok) {
      const snapHtml = await res2.text();
      // Match downloadable links
      const linkRegex = /href="([^"]+)"[^>]*>Download (HD|SD)/gi;
      let match;
      const formats = [];
      while ((match = linkRegex.exec(snapHtml)) !== null) {
        const dUrl = match[1];
        const quality = match[2];
        if (dUrl && dUrl.startsWith("http")) {
          formats.push({
            format_id: quality.toLowerCase(),
            quality: `${quality} Quality Video`,
            resolution: quality === "HD" ? "720p" : "360p",
            ext: "mp4",
            url: dUrl,
            note: `Facebook ${quality}`
          });
        }
      }

      if (formats.length > 0) {
        return {
          success: true,
          platform: "facebook",
          title: "Facebook Video",
          uploader: "Facebook User",
          thumbnail: "",
          duration: 0,
          formats: formats
        };
      }
    }
  } catch (err) {
    console.error("Facebook SnapSave fallback error:", err);
  }

  throw new Error("Unable to extract Facebook video. Make sure the post/reel is set to Public.");
}
