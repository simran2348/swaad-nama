import { useEffect, useState } from 'react';
import { SectionHeading } from './Brand';
import type { TopRatedFood, TopRatedResponse } from '../../shared/api';
import { fetchTopRated } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { PlateIcon, StarIcon } from './icons';
import { track } from '../lib/track';

/** Last result, shown straight away while a fresh one loads. */
let topRatedCache: TopRatedResponse | null = null;

const CARD = 'h-44 w-32 shrink-0 snap-start rounded-2xl';

/** A food category: its best photo, name, average and rating count. */
export const FoodCard = ({
  food,
  onOpen,
}: {
  food: TopRatedFood;
  onOpen: (food: string) => void;
}) => (
  <button
    onClick={() => {
      track('top_rated_open');
      onOpen(food.food);
    }}
    aria-label={`${food.food}: ${food.average} out of 10 from ${food.count} ratings`}
    className="relative isolate block h-full w-full transform-gpu overflow-hidden rounded-2xl bg-cta-tint text-left shadow-md cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
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
);

/**
 * The most-rated food categories across everyone, as a sideways-scrolling
 * row, then a "Search categories" button. Tap one to see everyone's ratings
 * for it. Hidden when nobody has rated anything yet (or it fails).
 */
export const TopRatedRow = ({
  refreshKey,
  onOpen,
  onSearch,
}: {
  /** Change to reload (e.g. after a rating is edited). */
  refreshKey: number;
  onOpen: (food: string) => void;
  /** Opens the category search screen. */
  onSearch: () => void;
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
    <section aria-label="Most rated categories" className="flex flex-col gap-2">
      <SectionHeading>Most rated categories</SectionHeading>
      {/* Bleeds to the screen edges so cards scroll in from the side. A
          sideways-scrolling row clips above and below too, so it gets room
          for the cards' shadows and hover lift (taken back by -my). */}
      <ul className="no-scrollbar -mx-4 -my-3 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 py-3">
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
                <FoodCard food={food} onOpen={onOpen} />
              </li>
            ))}
      </ul>
      <button
        type="button"
        onClick={onSearch}
        className="self-center rounded-full px-3 py-1 text-xs font-bold text-cta cursor-pointer hover:bg-cta/10"
      >
        Search categories
      </button>
    </section>
  );
};
