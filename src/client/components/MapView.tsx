import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { FoodReview, InitResponse } from '../../shared/api';
import {
  FetchTileLayer,
  TILE_URL,
  WORLD_VIEW,
  getCachedMapArea,
  showArea,
  useMapArea,
} from '../lib/mapTiles';
import { PLACE_SEARCH_ENABLED } from '../lib/features';
import { InfoIcon } from './icons';
import { ReviewViewer } from './ReviewViewer';
import { ScreenHeader } from './ui';
import { track } from '../lib/track';

// Themed pin drawn with CSS (see `.map-pin` in index.css), so no image assets.
const pinIcon = L.divIcon({
  className: '',
  html: '<span class="map-pin"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  tooltipAnchor: [0, -26],
});

export const MapView = ({ data }: { data: InitResponse | null }) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [open, setOpen] = useState<FoodReview | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const area = useMapArea();
  // Already known on open: start there instead of flying in.
  const areaPreloaded = useRef(getCachedMapArea() !== undefined);

  const placed = (data?.myList ?? []).filter((r) => r.location);
  const hasPins = placed.length > 0;

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    }).setView(...WORLD_VIEW);
    const cached = getCachedMapArea();
    if (cached) showArea(instance, cached, false);
    new FetchTileLayer(TILE_URL, { maxZoom: 19 }).addTo(instance);
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
    };
  }, []);

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
        .on('click', () => {
          track('map_pin_open');
          setOpen(review);
        })
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
          <div className="mx-auto max-w-sm origin-top rounded-xl border border-line bg-popover px-4 py-3 text-sm text-ink shadow-xl">
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
