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

  // Formats for direct in-page processing
  formats.push({
    format_id: "mp4_hd",
    quality: "HD Video (MP4)",
    resolution: "720p HD",
    ext: "mp4",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    isDirectStream: false,
    note: "HD MP4 Video"
  });

  formats.push({
    format_id: "mp3_audio",
    quality: "Audio MP3",
    resolution: "Audio",
    ext: "mp3",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    isDirectStream: false,
    note: "High Quality MP3"
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
