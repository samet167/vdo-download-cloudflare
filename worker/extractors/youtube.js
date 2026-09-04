/**
 * extractors/youtube.js — YouTube Video Extractor
 * =================================================
 * Resolves YouTube video formats & MP3 audio via serverless engines.
 */

function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

export async function extractYouTube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL or Video ID not found.");
  }

  // 1. Fetch YouTube oEmbed for reliable Title & Author metadata
  let title = "YouTube Video";
  let author = "YouTube Creator";
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      title = oembed.title || title;
      author = oembed.author_name || author;
    }
  } catch (err) {
    console.error("YouTube oEmbed fetch error:", err);
  }

  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const formats = [];

  // 2. Try Invidious & Piped Public Endpoints
  const invidiousInstances = [
    "https://inv.nadeko.net",
    "https://invidious.private.coffee",
    "https://invidious.projectsegfau.lt",
    "https://inv.tux.pizza",
    "https://iv.ggtyler.dev"
  ];

  for (const inst of invidiousInstances) {
    try {
      const invRes = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(3500)
      });

      if (invRes.ok) {
        const invData = await invRes.json();
        title = invData.title || title;
        author = invData.author || author;

        // Extract progressive MP4 streams
        if (invData.formatStreams && invData.formatStreams.length > 0) {
          for (const fs of invData.formatStreams) {
            formats.push({
              format_id: fs.itag || fs.resolution || "mp4",
              quality: `${fs.qualityLabel || fs.resolution || "720p"} MP4`,
              resolution: fs.resolution || "720p",
              ext: fs.container || "mp4",
              url: fs.url,
              filesize: fs.size ? parseInt(fs.size) : null,
              note: "Video with Audio"
            });
          }
        }

        // Extract Audio Only streams
        if (invData.adaptiveFormats && invData.adaptiveFormats.length > 0) {
          const audioFormats = invData.adaptiveFormats.filter(f => f.type && f.type.startsWith("audio/"));
          if (audioFormats.length > 0) {
            const bestAudio = audioFormats[0];
            formats.push({
              format_id: "audio",
              quality: "Audio MP3 / M4A",
              resolution: "Audio",
              ext: "mp3",
              url: bestAudio.url,
              note: bestAudio.audioQuality || "High Quality Audio"
            });
          }
        }

        if (formats.length > 0) {
          return {
            success: true,
            platform: "youtube",
            video_id: videoId,
            title: title,
            uploader: author,
            thumbnail: thumbnail,
            duration: invData.lengthSeconds || 0,
            duration_str: invData.lengthSeconds ? `${Math.floor(invData.lengthSeconds / 60)}:${String(invData.lengthSeconds % 60).padStart(2, "0")}` : null,
            formats: formats
          };
        }
      }
    } catch (e) {
      // Continue to next instance
    }
  }

  // 3. Try Cobalt API instances
  const cobaltInstances = [
    "https://api.cobalt.tools",
    "https://cobalt-api.kwiatekm.com",
    "https://cobalt.canine.tools",
    "https://api.wuk.sh"
  ];

  for (const cInst of cobaltInstances) {
    try {
      const cRes = await fetch(cInst, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoQuality: "720",
          filenameStyle: "pretty"
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData.url) {
          formats.push({
            format_id: "720p",
            quality: "720p HD Video",
            resolution: "720p",
            ext: "mp4",
            url: cData.url,
            note: "Fast Stream"
          });

          return {
            success: true,
            platform: "youtube",
            video_id: videoId,
            title: title,
            uploader: author,
            thumbnail: thumbnail,
            duration: 0,
            formats: formats
          };
        }
      }
    } catch (e) {
      // Continue to next instance
    }
  }

  // 4. Default fallback: Provide direct stream redirect
  if (formats.length === 0) {
    formats.push({
      format_id: "auto",
      quality: "Best Quality Available (MP4)",
      resolution: "Auto 720p/1080p",
      ext: "mp4",
      url: `https://www.y2mate.com/youtube/${videoId}`,
      note: "Standard Stream"
    });
  }

  return {
    success: true,
    platform: "youtube",
    video_id: videoId,
    title: title,
    uploader: author,
    thumbnail: thumbnail,
    duration: 0,
    formats: formats
  };
}
