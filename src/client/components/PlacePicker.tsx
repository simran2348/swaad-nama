import { useEffect, useState } from 'react';
import type { PlaceLocation, PlaceSearchResponse } from '../../shared/api';
import { searchPlaces } from '../lib/api';
import { PLACE_SEARCH_ENABLED } from '../lib/features';
import { Spinner } from './ui';

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
        <p className="mt-1 text-xs text-muted">
          📍 Location search is coming soon.
        </p>
      )}
      {location && (
        <p className="mt-1 flex items-start gap-1 text-xs text-muted">
          <span aria-hidden>📍</span>
          {location.address || 'Location saved'}
        </p>
      )}
      {focused && searching && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-field shadow-xl">
          {loading ? (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
              <Spinner className="h-4 w-4 text-cta" /> Searching…
            </li>
          ) : places.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">
              No matches. You can keep the name as typed.
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
