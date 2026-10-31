import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  PlaceAtResponse,
  PlaceLocation,
  PlaceSearchResponse,
} from '../../shared/api';
import { placeAtSpot, searchPlaces } from '../lib/api';
import {
  FetchTileLayer,
  TILE_URL,
  getCachedMapArea,
  showArea,
  useMapArea,
} from '../lib/mapTiles';
import { useTheme } from '../lib/theme';
import { ThemeSurface } from './FoodBackground';
import { CloseIcon, PinIcon, SearchIcon } from './icons';
import { BackButton, Spinner } from './ui';

type Place = PlaceAtResponse['place'];

/** Closer than this, a pin can land on the wrong building. */
const MIN_ZOOM_TO_PICK = 15;
/** Wait for the map to settle before looking up the address. */
const LOOKUP_DELAY_MS = 450;
/** Before the subreddit's area loads (or if it has none): India. */
const INDIA_VIEW: [L.LatLngExpression, number] = [[22.5, 79], 5];

type Spot = { lat: number; lon: number; zoom: number };

type Lookup =
  | { for: string; state: 'found'; place: Place }
  | { for: string; state: 'error'; message: string };

type SearchResult = PlaceSearchResponse['places'][number];

const SEARCH_DELAY_MS = 400;

/**
 * Search box over the map: find an area, street or landmark and jump there,
 * then fine-tune the pin by moving the map.
 */
const AreaSearch = ({ onGo }: { onGo: (lat: number, lon: number) => void }) => {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{
    query: string;
    places: SearchResult[];
  }>();
  const query = text.trim();
  const searching = open && query.length >= 2;

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPlaces(query)
        .then((res) => !cancelled && setResults({ query, places: res.places }))
        .catch(() => !cancelled && setResults({ query, places: [] }));
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searching]);

  const places = results?.query === query ? results.places : null;

  return (
    <div className="absolute inset-x-3 top-3 z-[600]">
      <div className="flex items-center gap-2 rounded-full border border-line bg-popover px-3.5 shadow-lg">
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Delay so a tap on a result registers before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search an area or landmark"
          aria-label="Search an area or landmark"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText('')}
            aria-label="Clear search"
            className="text-muted cursor-pointer hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {searching && (
        <ul className="mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-line bg-popover shadow-xl">
          {!places ? (
            <li className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted">
              <Spinner className="h-4 w-4 text-cta" /> Searching…
            </li>
          ) : places.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-muted">
              Nothing found. Try a nearby area or landmark.
            </li>
          ) : (
            places.map((place) => (
              <li key={`${place.lat},${place.lon}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onGo(place.lat, place.lon);
                    setText(place.name);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left cursor-pointer hover:bg-soft"
                >
                  <p className="truncate text-sm font-semibold text-ink">
                    {place.name}
                  </p>
                  {place.address && (
                    <p className="truncate text-xs text-muted">
                      {place.address}
                    </p>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

const spotKey = ({ lat, lon }: Spot) => `${lat.toFixed(6)},${lon.toFixed(6)}`;

/**
 * Full-screen map with a pin fixed in the middle: move the map under the pin
 * to the place, then "Use this spot". Shows the address under the pin.
 */
export const MapPicker = ({
  initial,
  onPick,
  onClose,
}: {
  /** The place's saved spot, when changing it. */
  initial?: PlaceLocation | undefined;
  onPick: (place: Place) => void;
  onClose: () => void;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  // Once the user moves the map, the area loading late mustn't move it.
  const touched = useRef(Boolean(initial));
  const area = useMapArea();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [moving, setMoving] = useState(false);
  const [lookup, setLookup] = useState<Lookup>();

  // Create the map once, on the saved spot, the area, or India.
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      attributionControl: false,
    });
    const cached = getCachedMapArea();
    if (initial) instance.setView([initial.lat, initial.lon], 17);
    else if (cached) showArea(instance, cached, false);
    else instance.setView(...INDIA_VIEW);
    new FetchTileLayer(TILE_URL, { maxZoom: 19 }).addTo(instance);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);

    const report = () => {
      const c = instance.getCenter();
      setSpot({ lat: c.lat, lon: c.lng, zoom: instance.getZoom() });
    };
    instance.on('movestart', () => setMoving(true));
    instance.on('moveend', () => {
      setMoving(false);
      report();
    });
    // A drag or pinch means the user is choosing; stop auto-framing.
    instance.on('dragstart zoomstart', () => {
      touched.current = true;
    });
    report();
    map.current = instance;

    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
    };
    // `initial` is only the starting view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The area arrived after opening: frame it, unless they've moved already.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !area || touched.current) return;
    showArea(instance, area, true);
  }, [area]);

  // Look up the address under the pin once the map settles.
  const canPick = Boolean(spot && spot.zoom >= MIN_ZOOM_TO_PICK);
  useEffect(() => {
    if (!spot || spot.zoom < MIN_ZOOM_TO_PICK || moving) return;
    const key = spotKey(spot);
    let cancelled = false;
    const timer = setTimeout(() => {
      placeAtSpot(spot.lat, spot.lon)
        .then(({ place }) => {
          if (!cancelled) setLookup({ for: key, state: 'found', place });
        })
        .catch((err: Error) => {
          if (!cancelled) {
            setLookup({ for: key, state: 'error', message: err.message });
          }
        });
    }, LOOKUP_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [spot, moving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current =
    spot && !moving && lookup?.for === spotKey(spot) ? lookup : undefined;
  const found = canPick && current?.state === 'found' ? current.place : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick the place on the map"
      className="screen-in fixed inset-0 z-50 mx-auto flex max-w-[768px] flex-col"
    >
      <ThemeSurface
        palette={useTheme()}
        withArt={false}
        className="absolute inset-0 -z-10"
      />
      <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <BackButton onClick={onClose} />
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold text-ink">
            Pick the spot
          </h1>
          <p className="truncate text-xs text-muted">
            Search nearby, then move the map so the pin is on the place
          </p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={container} className="absolute inset-0 z-0" />
        <AreaSearch
          onGo={(lat, lon) => {
            touched.current = true;
            const reduce = window.matchMedia(
              '(prefers-reduced-motion: reduce)'
            ).matches;
            if (reduce) map.current?.setView([lat, lon], 17);
            else map.current?.flyTo([lat, lon], 17, { duration: 0.8 });
          }}
        />
        {/* The pin stays in the middle; its tip marks the spot. It lifts
            while the map moves, and a dot shows exactly where it'll land. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[500]">
          <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-black/40" />
          <span
            className={`absolute -top-[34px] -left-[14px] transition-transform duration-200 ${
              moving ? '-translate-y-2' : ''
            }`}
          >
            <span className="map-pin" />
          </span>
        </div>
        <p className="pointer-events-none absolute bottom-1 left-2 z-[500] text-[10px] text-black/55">
          © OpenStreetMap · © CARTO
        </p>
      </div>

      <div className="border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mb-3 flex min-h-11 items-start gap-2">
          <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-cta" />
          {!canPick ? (
            <p className="text-sm text-muted">
              Zoom in to place the pin accurately.
            </p>
          ) : !current ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="h-4 w-4 text-cta" /> Finding the address…
            </p>
          ) : current.state === 'error' ? (
            <p className="text-sm font-semibold text-rose-500">
              {current.message}
            </p>
          ) : (
            <div className="min-w-0">
              {current.place.name && (
                <p className="truncate text-sm font-bold text-ink">
                  {current.place.name}
                </p>
              )}
              <p className="line-clamp-2 text-xs text-muted">
                {current.place.address ||
                  'Address not found, but the spot is saved.'}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={!found}
          onClick={() => found && onPick(found)}
          className="w-full rounded-full bg-cta px-4 py-2.5 font-bold text-cta-ink shadow-md cursor-pointer transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use this spot
        </button>
      </div>
    </div>,
    document.body
  );
};
