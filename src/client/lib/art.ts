import { useEffect, useState } from 'react';

export const ART_URL = '/h2.png';

/** Empty-state illustrations (with their pixel sizes): My List and Ratings. */
export const EMPTY_LIST_IMAGE = {
  src: '/no-rating.png',
  width: 416,
  height: 288,
};
export const EMPTY_RATINGS_IMAGE = {
  src: '/no-item.png',
  width: 365,
  height: 288,
};

/** Shown when a user has no Reddit avatar (or it fails to load). */
export const FALLBACK_AVATAR_URL = '/snoo.png';

/**
 * True once the image at `src` has downloaded (or failed to). Stays false
 * while `src` is null, e.g. before we know which image to load.
 */
export const useImageLoaded = (src: string | null) => {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    const done = () => setLoadedSrc(src);
    img.onload = done;
    img.onerror = done;
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  return src !== null && loadedSrc === src;
};
