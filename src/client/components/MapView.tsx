import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { FoodReview, InitResponse, MapArea } from '../../shared/api';
import { fetchMapArea } from '../lib/api';
import { PLACE_SEARCH_ENABLED } from '../lib/features';
import { useTheme } from '../lib/theme';
import { InfoIcon } from './icons';
import { ReviewViewer } from './ReviewViewer';
import { ScreenHeader } from './ui';

// Tiles are proxied through our server (see server/core/external.ts).
// Bump `v` to skip tiles the webview has cached (e.g. watermarked ones).
const TILE_VERSION = 2;
const tileUrl = (dark: boolean) =>
  `/api/tiles/${dark ? 'dark' : 'light'}/{z}/{x}/{y}{r}?v=${TILE_VERSION}`;

/**
 * Loads tiles with `fetch` rather than plain <img> requests: Devvit only adds
 * the login token to `fetch` calls, and /api rejects requests without it.
 */
class FetchTileLayer extends L.TileLayer {
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

// Themed pin drawn with CSS (see `.map-pin` in index.css), so no image assets.
const pinIcon = L.divIcon({
  className: '',
  html: '<span class="map-pin"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  tooltipAnchor: [0, -26],
});

/** The subreddit's map area, kept for the session (undefined = not loaded yet). */
let areaCache: MapArea | null | undefined;

const WORLD_VIEW: [L.LatLngExpression, number] = [[20, 0], 2];

/** Frames the subreddit's area: its bounds if known, else its centre. */
const showArea = (instance: L.Map, area: MapArea, animate: boolean) => {
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

export const MapView = ({ data }: { data: InitResponse | null }) => {
  const { dark } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const [open, setOpen] = useState<FoodReview | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [area, setArea] = useState(areaCache);
  // Already known on open: start there instead of flying in.
  const areaPreloaded = useRef(areaCache !== undefined);

  const placed = (data?.myList ?? []).filter((r) => r.location);
  const hasPins = placed.length > 0;

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

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    }).setView(...WORLD_VIEW);
    if (areaCache) showArea(instance, areaCache, false);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    // Tapping the map closes the info panel.
    instance.on('click', () => setShowInfo(false));
    map.current = instance;
    // Re-measure when the view is resized, or parts of the map stay blank.
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      tiles.current = null;
    };
  }, []);

  // Light or dark tiles to match the palette.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    tiles.current?.remove();
    tiles.current = new FetchTileLayer(tileUrl(dark), { maxZoom: 19 }).addTo(
      instance
    );
  }, [dark]);

  // No pins yet: open on the subreddit's area (pins take over once there are some).
  useEffect(() => {
    const instance = map.current;
    if (!instance || !area || hasPins) return;
    showArea(instance, area, !areaPreloaded.current);
  }, [area, hasPins]);

  // One pin per reviewed place; fit the view around them.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layer = L.layerGroup().addTo(instance);
    const points: L.LatLngExpression[] = [];
    for (const review of data?.myList ?? []) {
      if (!review.location) continue;
      const point: L.LatLngExpression = [
        review.location.lat,
        review.location.lon,
      ];
      points.push(point);
      L.marker(point, { icon: pinIcon, title: review.place })
        .bindTooltip(`${review.place} · ${review.rating}/10`, {
          direction: 'top',
          className: 'map-tooltip',
        })
        .on('click', () => setOpen(review))
        .addTo(layer);
    }
    if (points.length === 1 && points[0]) {
      instance.setView(points[0], 15);
    } else if (points.length > 1) {
      instance.fitBounds(L.latLngBounds(points), {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
    return () => {
      layer.remove();
    };
  }, [data?.myList]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ScreenHeader
        title="Map"
        subtitle={
          placed.length
            ? `${placed.length} ${placed.length === 1 ? 'place' : 'places'} you've been to`
            : "Places you've been to"
        }
        right={
          <button
            type="button"
            onClick={() => setShowInfo((s) => !s)}
            aria-label="About the map"
            aria-expanded={showInfo}
            aria-controls="map-info"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
              showInfo ? 'bg-cta text-cta-ink' : 'text-muted hover:bg-soft'
            }`}
          >
            <InfoIcon className="h-5 w-5" />
          </button>
        }
      />
      <div className="relative min-h-0 flex-1">
        <div ref={container} className="absolute inset-0 z-0" />
        {/* Always mounted so it can fade and slide in and out. */}
        <div
          id="map-info"
          role="note"
          aria-hidden={!showInfo}
          className={`absolute inset-x-0 top-3 z-[500] px-4 transition-all duration-300 ease-out motion-reduce:transition-none ${
            showInfo
              ? 'translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-2 scale-[0.97] opacity-0'
          }`}
        >
          <div className="mx-auto max-w-sm origin-top rounded-xl border border-line bg-field px-4 py-3 text-sm text-ink shadow-xl">
            <p>
              {PLACE_SEARCH_ENABLED
                ? placed.length
                  ? 'Each pin is a place you rated. Tap one to see your rating.'
                  : "Pick a café from the search when adding a rating and it'll show up here."
                : 'Location search is coming soon. Places you rate will show up here.'}
            </p>
            {PLACE_SEARCH_ENABLED && placed.length > 0 && (
              <p className="mt-1 text-muted">
                To pin an older rating, edit it and pick the café from the
                search.
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted">
              Map data © OpenStreetMap contributors · Tiles © CARTO
            </p>
          </div>
        </div>
      </div>
      {open && <ReviewViewer review={open} onClose={() => setOpen(null)} />}
    </div>
  );
};
