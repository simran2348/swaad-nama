import { useEffect, useState } from 'react';
import type { TopRatedResponse } from '../../shared/api';
import { fetchTopRated } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { PlateIcon, StarIcon, TrophyIcon } from './icons';

/** Last result, shown straight away while a fresh one loads. */
let topRatedCache: TopRatedResponse | null = null;

const CARD = 'h-44 w-32 shrink-0 snap-start rounded-2xl';

/**
 * Food categories with the best average rating across everyone, as a
 * sideways-scrolling row. Tap one to see everyone's ratings for it.
 * Hidden when nobody has rated anything yet (or it fails).
 */
export const TopRatedRow = ({
  refreshKey,
  onOpen,
}: {
  /** Change to reload (e.g. after a rating is edited). */
  refreshKey: number;
  onOpen: (food: string) => void;
}) => {
  const [data, setData] = useState(topRatedCache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTopRated()
      .then((res) => {
        topRatedCache = res;
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        console.error('Top rated failed', err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if ((failed && !data) || (data && data.foods.length === 0)) return null;

  return (
    <section aria-label="Top rated by everyone" className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 px-1 text-sm font-extrabold text-ink">
        <TrophyIcon className="h-4 w-4 text-cta" />
        Top rated
        <span className="font-semibold text-muted">by everyone</span>
      </h2>
      {/* Bleeds to the screen edges so cards scroll in from the side. */}
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
        {!data
          ? [0, 1, 2].map((i) => (
              <li
                key={i}
                aria-hidden
                className={`${CARD} animate-pulse bg-soft`}
              />
            ))
          : data.foods.map((food, i) => (
              <li
                key={food.food}
                className={`rise ${CARD}`}
                style={riseDelay(i)}
              >
                <button
                  onClick={() => onOpen(food.food)}
                  aria-label={`${food.food}: ${food.average} out of 10 from ${food.count} ratings`}
                  className="relative isolate block h-full w-full transform-gpu overflow-hidden rounded-2xl bg-cta/15 text-left shadow-md cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {food.image ? (
                    <img
                      src={food.image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center pb-10 text-cta">
                      <PlateIcon className="h-10 w-10" />
                    </span>
                  )}
                  {/* Shade so the text stays readable on bright photos. */}
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2.5 text-white">
                    <span className="line-clamp-2 text-sm leading-tight font-extrabold [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
                      {food.food}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                        <StarIcon className="h-3 w-3 text-amber-300" />
                        {food.average.toFixed(1)}
                      </span>
                      <span className="opacity-80">
                        {food.count} {food.count === 1 ? 'rating' : 'ratings'}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
      </ul>
    </section>
  );
};
