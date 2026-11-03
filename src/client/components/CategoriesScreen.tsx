import { useEffect, useState } from 'react';
import type { TopRatedFood } from '../../shared/api';
import { searchFoods } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { CloseIcon, SearchIcon } from './icons';
import { FoodCard } from './TopRatedRow';
import { BackButton, EmptyState, LoadingState } from './ui';

type Result = { query: string } & (
  { ok: true; foods: TopRatedFood[] } | { ok: false; error: string }
);

/** Wait for a pause in typing before searching. */
const SEARCH_DELAY_MS = 300;

/**
 * Every food category rated here, most-rated first, with a search box to
 * find one by name. Tap a card to see everyone's ratings for it.
 */
export const CategoriesScreen = ({
  refreshKey,
  onBack,
  onOpen,
}: {
  refreshKey: number;
  onBack: () => void;
  onOpen: (food: string) => void;
}) => {
  const [text, setText] = useState('');
  const query = text.trim();
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    let cancelled = false;
    // The full list loads at once; searches wait for a pause in typing.
    const timer = setTimeout(
      () => {
        searchFoods(query)
          .then((res) => {
            if (!cancelled) setResult({ query, ok: true, foods: res.foods });
          })
          .catch((err: Error) => {
            if (!cancelled) setResult({ query, ok: false, error: err.message });
          });
      },
      query ? SEARCH_DELAY_MS : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, refreshKey]);

  const current = result?.query === query ? result : undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <section className="flex shrink-0 items-start gap-1.5 px-3 pt-3">
        <BackButton onClick={onBack} />
        <div className="min-w-0 pt-0.5">
          <h1 className="truncate text-xl leading-tight font-extrabold text-ink">
            Categories
          </h1>
          <p className="truncate text-sm text-muted">
            Every dish rated here, most-rated first
          </p>
        </div>
      </section>
      <main className="scroll-area flex flex-1 flex-col gap-4 px-4 pt-3 pb-6">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search a dish, e.g. Biryani"
            aria-label="Search categories"
            maxLength={60}
            className="w-full rounded-full border border-line bg-field py-2.5 pr-10 pl-9 text-sm text-ink placeholder:text-muted focus:ring-2 focus:ring-cta focus:outline-none"
          />
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted cursor-pointer hover:text-ink"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {!current ? (
          <LoadingState />
        ) : !current.ok ? (
          <EmptyState>Couldn't load categories: {current.error}</EmptyState>
        ) : current.foods.length === 0 ? (
          <EmptyState>
            {query
              ? `No category matches "${query}".`
              : 'Nobody has rated anything yet.'}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {current.foods.map((food, i) => (
              <li key={food.food} className="rise h-44" style={riseDelay(i)}>
                <FoodCard food={food} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};
