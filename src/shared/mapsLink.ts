/** Reading a place's coordinates from a pasted Google Maps link. */

export type Coords = { lat: number; lon: number };

// Short share links, which redirect to a full maps URL.
const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);

const isGoogleHost = (host: string) =>
  /^(www\.|maps\.)?google\.[a-z.]+$/.test(host);

const parseUrl = (text: string): URL | null => {
  try {
    return new URL(text.trim());
  } catch {
    return null;
  }
};

/** A Google Maps share link (maps.app.goo.gl/… or goo.gl/maps/…). */
export const isShortMapsLink = (text: string): boolean => {
  const url = parseUrl(text);
  if (!url || url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return (
    SHORT_HOSTS.has(host) &&
    (host !== 'goo.gl' || url.pathname.startsWith('/maps'))
  );
};

/** A full Google Maps URL (google.com/maps/…, maps.google.com/…). */
export const isFullMapsLink = (text: string): boolean => {
  const url = parseUrl(text);
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return (
    isGoogleHost(host) &&
    (host.startsWith('maps.') || url.pathname.startsWith('/maps'))
  );
};

const toCoords = (lat: string, lon: string): Coords | null => {
  const a = Number(lat);
  const b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  if (a === 0 && b === 0) return null;
  return { lat: a, lon: b };
};

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

/**
 * Coordinates in a full maps URL. Prefers the place's own pin (`!3d…!4d…`)
 * over the map view (`@lat,lon`), which can be off-centre.
 */
export const coordsFromMapsUrl = (text: string): Coords | null => {
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // Keep the raw text.
  }
  const pin = new RegExp(`!3d${NUM}!4d${NUM}`).exec(decoded);
  if (pin?.[1] && pin[2]) return toCoords(pin[1], pin[2]);

  const url = parseUrl(text);
  if (url) {
    for (const key of ['q', 'query', 'll', 'destination', 'center']) {
      const value = url.searchParams.get(key);
      const match =
        value && new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}`).exec(value);
      if (match?.[1] && match[2]) return toCoords(match[1], match[2]);
    }
  }

  const view = new RegExp(`@${NUM},${NUM}`).exec(decoded);
  if (view?.[1] && view[2]) return toCoords(view[1], view[2]);
  return null;
};

/** The place name in a full maps URL (`/maps/place/Name+Here/…`), if any. */
export const placeNameFromMapsUrl = (text: string): string => {
  const url = parseUrl(text);
  const match = url && /\/maps\/place\/([^/]+)/.exec(url.pathname);
  if (!match?.[1]) return '';
  try {
    const name = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
    // A place given only as coordinates has no name.
    return /^-?\d/.test(name) ? '' : name.slice(0, 80);
  } catch {
    return '';
  }
};
