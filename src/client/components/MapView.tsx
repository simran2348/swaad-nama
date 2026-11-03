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
import { CloseIcon, InfoIcon } from './icons';
import { ReviewViewer } from './ReviewViewer';
import { track } from '../lib/track';
import { TIER_COLORS } from '../lib/tiers';
import { tierFor } from '../../shared/food';

// Themed pin drawn with CSS (see `.map-pin` in index.css), so no image assets.
const pinIcon = L.divIcon({
  className: '',
  html: '<span class="map-pin"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  tooltipAnchor: [0, -26],
});

type Placed = FoodReview & { location: NonNullable<FoodReview['location']> };

/** About 10 m: ratings this close count as the same place (one pin). */
const spotKey = ({ location }: Placed) =>
  `${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;

/** Ratings grouped by spot, best rated first within each place. */
const groupBySpot = (reviews: FoodReview[]): Placed[][] => {
  const groups = new Map<string, Placed[]>();
  for (const review of reviews) {
    const { location } = review;
    if (!location) continue;
    const placed = { ...review, location };
    const key = spotKey(placed);
    groups.set(key, [...(groups.get(key) ?? []), placed]);
  }
  return [...groups.values()].map((group) =>
    group.sort((a, b) => b.rating - a.rating)
  );
};

/** Card over the map listing every dish rated at one place. */
const PlaceCard = ({
  reviews,
  onOpen,
  onClose,
}: {
  reviews: Placed[];
  onOpen: (review: FoodReview) => void;
  onClose: () => void;
}) => {
  const [first] = reviews;
  if (!first) return null;
  // Above Leaflet's zoom buttons (z 1000), which it can overlap on phones.
  return (
    <div className="absolute inset-x-0 bottom-[calc(var(--above-nav)+0.75rem)] z-[1001] px-4">
      <div
        role="dialog"
        aria-label={`Your ratings at ${first.place}`}
        className="mx-auto max-w-sm rounded-2xl border border-line bg-popover shadow-xl"
      >
        <div className="flex items-start gap-2 px-4 pt-3 pb-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink">
              {first.place}
            </p>
            <p className="truncate text-xs text-muted">
              {reviews.length} dishes rated
              {first.location.address ? ` · ${first.location.address}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted cursor-pointer hover:bg-soft hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-52 overflow-y-auto border-t border-line py-1">
          {reviews.map((review) => {
            const tier = tierFor(review.rating);
            return (
              <li key={review.id}>
                <button
                  type="button"
                  onClick={() => onOpen(review)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left cursor-pointer hover:bg-soft"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-white ${TIER_COLORS[tier]}`}
                  >
                    {tier}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">
                      {review.food}
                    </span>
                    {review.place !== first.place && (
                      <span className="block truncate text-xs text-muted">
                        {review.place}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-ink">
                    {review.rating}/10
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export const MapView = ({ data }: { data: InitResponse | null }) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [open, setOpen] = useState<FoodReview | null>(null);
  // A place with several rated dishes, listed so one can be picked.
  const [spot, setSpot] = useState<Placed[] | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const area = useMapArea();
  // Already known on open: start there instead of flying in.
  const areaPreloaded = useRef(getCachedMapArea() !== undefined);

  const spots = groupBySpot(data?.myList ?? []);
  const hasPins = spots.length > 0;

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
    // Tapping the map closes the info panel and the place card.
    instance.on('click', () => {
      setShowInfo(false);
      setSpot(null);
    });
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

  // One pin per place (several dishes there share it); fit the view
  // around them.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layer = L.layerGroup().addTo(instance);
    const points: L.LatLngExpression[] = [];
    for (const group of groupBySpot(data?.myList ?? [])) {
      const [first] = group;
      if (!first) continue;
      const point: L.LatLngExpression = [
        first.location.lat,
        first.location.lon,
      ];
      points.push(point);
      const label =
        group.length === 1
          ? `${first.place} · ${first.rating}/10`
          : `${first.place} · ${group.length} dishes`;
      L.marker(point, { icon: pinIcon, title: first.place })
        .bindTooltip(label, { direction: 'top', className: 'map-tooltip' })
        .on('click', () => {
          track('map_pin_open');
          // One dish: open it. Several: list them to pick from.
          if (group.length === 1) {
            setSpot(null);
            setOpen(first);
          } else {
            setSpot(group);
          }
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
    setSpot(null);
    return () => {
      layer.remove();
    };
  }, [data?.myList]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* The map fills the screen; the bottom nav floats over it, so the
          zoom buttons (Leaflet's bottom corner) sit just above the nav. */}
      <div className="map-under-nav relative min-h-0 flex-1">
        <div ref={container} className="absolute inset-0 z-0" />
        {/* Always mounted so it can fade and slide in and out. */}
        <div
          id="map-info"
          role="note"
          aria-hidden={!showInfo}
          className={`absolute inset-x-0 top-3 z-[1001] px-4 pt-[env(safe-area-inset-top)] transition-all duration-300 ease-out motion-reduce:transition-none ${
            showInfo
              ? 'translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-2 scale-[0.97] opacity-0'
          }`}
        >
          <div className="mx-auto max-w-sm origin-top rounded-xl border border-line bg-popover px-4 py-3 text-sm text-ink shadow-xl">
            <p className="font-extrabold">
              {spots.length
                ? `${spots.length} ${spots.length === 1 ? 'place' : 'places'} you've been to`
                : "Places you've been to"}
            </p>
            <p className="mt-1">
              {PLACE_SEARCH_ENABLED
                ? spots.length
                  ? 'Each pin is a place you rated. Tap one to see your rating.'
                  : "Pick a café from the search when adding a rating and it'll show up here."
                : 'Location search is coming soon. Places you rate will show up here.'}
            </p>
            {PLACE_SEARCH_ENABLED && spots.length > 0 && (
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
        <button
          type="button"
          onClick={() => setShowInfo((s) => !s)}
          aria-label="About the map"
          aria-expanded={showInfo}
          aria-controls="map-info"
          className={`absolute bottom-[calc(var(--above-nav)+10px)] left-2.5 z-[1000] flex h-9 w-9 items-center justify-center rounded-full border border-line shadow-lg transition-colors cursor-pointer ${
            showInfo
              ? 'bg-cta text-cta-ink'
              : 'bg-popover text-ink hover:bg-soft'
          }`}
        >
          <InfoIcon className="h-5 w-5" />
        </button>
        {spot && (
          <PlaceCard
            reviews={spot}
            onOpen={(review) => {
              setSpot(null);
              setOpen(review);
            }}
            onClose={() => setSpot(null)}
          />
        )}
      </div>
      {open && <ReviewViewer review={open} onClose={() => setOpen(null)} />}
    </div>
  );
};
