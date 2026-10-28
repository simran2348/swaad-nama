import { useEffect, useState } from 'react';
import type { PlaceLocation, PlaceSearchResponse } from '../../shared/api';
import { placeFromLink, searchPlaces } from '../lib/api';
import { PLACE_SEARCH_ENABLED } from '../lib/features';
import { Spinner } from './ui';
import { CloseIcon, PinIcon } from './icons';

type Place = PlaceSearchResponse['places'][number];

const SEARCH_DELAY_MS = 400;

/**
 * Café / restaurant name with search-as-you-type. Picking a result also sets
 * its location (used by the map); typing a custom name clears it.
 */
export const PlacePicker = ({
  name,
  location,
  onChange,
  inputClass,
}: {
  name: string;
  location: PlaceLocation | undefined;
  onChange: (name: string, location: PlaceLocation | undefined) => void;
  inputClass: string;
}) => {
  const [results, setResults] = useState<{ query: string; places: Place[] }>();
  const [focused, setFocused] = useState(false);
  const query = name.trim();
  const searching = PLACE_SEARCH_ENABLED && !location && query.length >= 2;

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPlaces(query)
        .then((res) => !cancelled && setResults({ query, places: res.places }))
        .catch((err) => {
          console.error('Place search failed', err);
          if (!cancelled) setResults({ query, places: [] });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searching]);

  const places = searching && results?.query === query ? results.places : [];
  const loading = searching && results?.query !== query;

  // Fallback when search can't find the place: a pasted Google Maps link.
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState('');

  const openLink = () => {
    setLinkOpen(true);
    setLinkError('');
    setFocused(false);
  };

  const addLink = async () => {
    if (!link.trim() || linkBusy) return;
    setLinkBusy(true);
    setLinkError('');
    try {
      const { place } = await placeFromLink(link.trim());
      // Keep the name they typed; else use the one from the link.
      onChange(name.trim() || place.name, {
        address: place.address,
        lat: place.lat,
        lon: place.lon,
      });
      setLinkOpen(false);
      setLink('');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={name}
        maxLength={80}
        placeholder={
          PLACE_SEARCH_ENABLED
            ? 'Search a café or restaurant'
            : 'Café or restaurant name'
        }
        onFocus={() => setFocused(true)}
        // Delay so a tap on a result registers before the list closes.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => onChange(e.target.value, undefined)}
      />
      {!PLACE_SEARCH_ENABLED && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <PinIcon className="h-3.5 w-3.5 shrink-0" />
          Location search is coming soon.
        </p>
      )}
      {location && (
        <p className="mt-1 flex items-start gap-1 text-xs text-muted">
          <PinIcon className="mt-px h-3.5 w-3.5 shrink-0" />
          {location.address || 'Location saved'}
        </p>
      )}
      {PLACE_SEARCH_ENABLED && !location && !linkOpen && (
        <button
          type="button"
          onClick={openLink}
          className="mt-1 flex items-center gap-1 text-xs font-semibold text-cta cursor-pointer hover:underline"
        >
          <PinIcon className="h-3.5 w-3.5 shrink-0" />
          Can't find it? Paste a Google Maps link
        </button>
      )}
      {PLACE_SEARCH_ENABLED && !location && linkOpen && (
        <div className="rise mt-2 rounded-xl border border-line bg-surface p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-ink">
              Google Maps link to the place
            </p>
            <button
              type="button"
              onClick={() => {
                setLinkOpen(false);
                setLinkError('');
              }}
              aria-label="Close"
              className="text-muted cursor-pointer hover:text-ink"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className={`${inputClass} min-w-0 flex-1`}
              value={link}
              inputMode="url"
              placeholder="https://maps.app.goo.gl/…"
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addLink();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void addLink()}
              disabled={!link.trim() || linkBusy}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-cta px-4 text-sm font-bold text-cta-ink cursor-pointer hover:brightness-95 disabled:opacity-50"
            >
              {linkBusy && <Spinner className="h-4 w-4" />}
              Add
            </button>
          </div>
          <p
            className={`mt-1.5 text-[11px] ${linkError ? 'font-semibold text-rose-500' : 'text-muted'}`}
          >
            {linkError ||
              'In Google Maps, open the place, tap Share and copy the link.'}
          </p>
        </div>
      )}
      {focused && searching && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-white shadow-xl dark:bg-neutral-900">
          {loading ? (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
              <Spinner className="h-4 w-4 text-cta" /> Searching…
            </li>
          ) : places.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">
              No matches. You can keep the name as typed, or{' '}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={openLink}
                className="font-semibold text-cta cursor-pointer hover:underline"
              >
                paste a Google Maps link
              </button>
              .
            </li>
          ) : (
            places.map((place) => (
              <li key={`${place.lat},${place.lon}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(place.name, {
                      address: place.address,
                      lat: place.lat,
                      lon: place.lon,
                    });
                    setFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left cursor-pointer hover:bg-soft"
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
          <li className="border-t border-line px-3 py-1 text-[10px] text-muted">
            Search by Photon · © OpenStreetMap contributors
          </li>
        </ul>
      )}
    </div>
  );
};
