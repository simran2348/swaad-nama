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

/** Ranking hero (Ratings → a category): the podium, with its pixel size. */
export const PODIUM_IMAGE = { src: '/podium.png', width: 781, height: 319 };

/** Medals for places 1 to 3 in a ranking. */
export const MEDAL_IMAGES: Record<number, string> = {
  1: '/p1.png',
  2: '/p2.png',
  3: '/p3.png',
};

/** Everything the ranking screen draws, so it can wait for all of it. */
export const RANKING_IMAGES = [
  PODIUM_IMAGE.src,
  ...Object.values(MEDAL_IMAGES),
];

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

/**
 * True once every image in `srcs` has downloaded (or failed to). Pass a
 * constant array (like {@link RANKING_IMAGES}), not one built each render.
 */
export const useImagesLoaded = (srcs: readonly string[]) => {
  const [loaded, setLoaded] = useState<readonly string[] | null>(null);
  useEffect(() => {
    let left = srcs.length;
    const images = srcs.map((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        left--;
        if (left === 0) setLoaded(srcs);
      };
      img.src = src;
      return img;
    });
    return () => {
      for (const img of images) img.onload = img.onerror = null;
    };
  }, [srcs]);
  return srcs.length === 0 || loaded === srcs;
};
