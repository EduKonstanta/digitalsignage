const YOUTUBE_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&#/]{11})/i;
const INSTAGRAM_RE = /instagram\.com\/(?:[a-zA-Z0-9_.]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/i;
const TIKTOK_RE = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i;

export type EmbedProvider = "YOUTUBE" | "INSTAGRAM" | "TIKTOK";

export interface EmbedOptions {
  muted?: boolean;
}

export const EMBED_PROVIDER_LABEL: Record<EmbedProvider, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export function detectEmbedProvider(url: string): EmbedProvider | null {
  if (!url) return null;
  if (YOUTUBE_RE.test(url)) return "YOUTUBE";
  if (INSTAGRAM_RE.test(url)) return "INSTAGRAM";
  if (TIKTOK_RE.test(url)) return "TIKTOK";
  return null;
}

export function getYoutubeId(url: string): string | null {
  return url.match(YOUTUBE_RE)?.[1] ?? null;
}

export function getInstagramEmbedPath(url: string): string | null {
  const match = url.match(INSTAGRAM_RE);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function getTiktokVideoId(url: string): string | null {
  return url.match(TIKTOK_RE)?.[1] ?? null;
}

/** Builds the iframe src for a known embed provider, or null if the URL doesn't match that provider. */
export function buildEmbedSrc(provider: string, url: string, options: EmbedOptions = {}): string | null {
  switch (provider) {
    case "YOUTUBE": {
      const id = getYoutubeId(url);
      return id
        ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=${options.muted === false ? 0 : 1}&controls=0&loop=1&playlist=${id}&rel=0&enablejsapi=1`
        : null;
    }
    case "INSTAGRAM": {
      const path = getInstagramEmbedPath(url);
      return path ? `https://www.instagram.com/${path}/embed` : null;
    }
    case "TIKTOK": {
      const id = getTiktokVideoId(url);
      return id ? `https://www.tiktok.com/embed/v2/${id}?autoplay=1` : null;
    }
    default:
      return null;
  }
}

/**
 * Resolves an iframe src for a media item: tries the declared mediaType first,
 * then falls back to sniffing the URL in case older rows were saved without an
 * explicit YOUTUBE/INSTAGRAM/TIKTOK mediaType.
 */
export function resolveEmbedSrc(
  mediaType: string,
  url: string,
  options: EmbedOptions = {},
): string | null {
  if (!url) return null;
  const direct = buildEmbedSrc(mediaType, url, options);
  if (direct) return direct;
  const provider = detectEmbedProvider(url);
  return provider ? buildEmbedSrc(provider, url, options) : null;
}
