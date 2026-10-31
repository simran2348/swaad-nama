import L from 'leaflet';
import { useEffect, useState } from 'react';
import type { MapArea } from '../../shared/api';
import { fetchMapArea } from './api';

// Tiles are proxied through our server (see server/core/external.ts).
// Bump `v` to skip tiles the webview has cached (e.g. watermarked ones).
const TILE_VERSION = 2;
// Always the light map, even in dark mode: it's easier to read. The pins,
// tooltips and panels around it still follow the theme.
export const TILE_URL = `/api/tiles/light/{z}/{x}/{y}{r}?v=${TILE_VERSION}`;

/**
 * Loads tiles with `fetch` rather than plain <img> requests: Devvit only adds
 * the login token to `fetch` calls, and /api rejects requests without it.
 */
export class FetchTileLayer extends L.TileLayer {
  protected override createTile(
    coords: L.Coords,
    done: L.DoneCallback
  ): HTMLElement {
    const img = document.createElement('img');
    img.alt = '';
    img.setAttribute('role', 'presentation');
    fetch(this.getTileUrl(coords))
      .then((res) => {
        if (!res.ok) throw new Error(`Tile failed (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          URL.revokeObjectURL(url);
          done(undefined, img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          done(new Error('Tile image failed'), img);
        };
        img.src = url;
      })
      .catch((err: Error) => done(err, img));
    return img;
  }
}

/** The subreddit's map area, kept for the session (undefined = not loaded yet). */
let areaCache: MapArea | null | undefined;

export const WORLD_VIEW: [L.LatLngExpression, number] = [[20, 0], 2];

/** Frames the subreddit's area: its bounds if known, else its centre. */
export const showArea = (instance: L.Map, area: MapArea, animate: boolean) => {
  const fly =
    animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (area.bounds) {
    const { south, west, north, east } = area.bounds;
    const bounds = L.latLngBounds([south, west], [north, east]);
    if (fly) instance.flyToBounds(bounds, { padding: [24, 24], duration: 1.2 });
    else instance.fitBounds(bounds, { padding: [24, 24] });
  } else if (fly) {
    instance.flyTo([area.lat, area.lon], area.zoom, { duration: 1.2 });
  } else {
    instance.setView([area.lat, area.lon], area.zoom);
  }
};

/** The area if it has been loaded this session (undefined = not yet). */
export const getCachedMapArea = () => areaCache;

/** The subreddit's map area, loaded once per session (null = none set). */
export const useMapArea = (): MapArea | null | undefined => {
  const [area, setArea] = useState(areaCache);
  useEffect(() => {
    if (areaCache !== undefined) return;
    let cancelled = false;
    void fetchMapArea()
      .then((res) => res.area)
      .catch(() => null)
      .then((found) => {
        areaCache = found;
        if (!cancelled) setArea(found);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return area;
};
