import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { FoodReview, InitResponse } from '../../shared/api';
import { PLACE_SEARCH_ENABLED } from '../lib/features';
import { useTheme } from '../lib/theme';
import { ReviewViewer } from './ReviewViewer';
import { EmptyState, ScreenHeader } from './ui';

// Tiles are proxied through our server (see server/core/external.ts).
const tileUrl = (dark: boolean) =>
  `/api/tiles/${dark ? 'dark' : 'light'}/{z}/{x}/{y}{r}`;

// Themed pin drawn with CSS (see `.map-pin` in index.css), so no image assets.
const pinIcon = L.divIcon({
  className: '',
  html: '<span class="map-pin"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  tooltipAnchor: [0, -26],
});

export const MapView = ({ data }: { data: InitResponse | null }) => {
  const { dark } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const [open, setOpen] = useState<FoodReview | null>(null);

  const placed = (data?.myList ?? []).filter((r) => r.location);

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    }).setView([20, 0], 2);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    L.control
      .attribution({ prefix: false })
      .addAttribution('© OpenStreetMap contributors © CARTO')
      .addTo(instance);
    map.current = instance;
    return () => {
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
    tiles.current = L.tileLayer(tileUrl(dark), { maxZoom: 19 }).addTo(instance);
  }, [dark]);

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
      />
      <div className="relative min-h-0 flex-1">
        <div ref={container} className="absolute inset-0 z-0" />
        {data && placed.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] px-4">
            <EmptyState>
              {PLACE_SEARCH_ENABLED
                ? "Pick a café from the search when adding a review and it'll show up here."
                : 'Location search is coming soon. Places you rate will show up here.'}
            </EmptyState>
          </div>
        )}
      </div>
      {open && <ReviewViewer review={open} onClose={() => setOpen(null)} />}
    </div>
  );
};
