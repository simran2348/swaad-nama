import { useEffect, useState, type ReactNode } from 'react';
import type { FoodRatersResponse } from '../../shared/api';
import { fetchFoodRaters } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { HeroBackdrop } from './decor';
import { RaterAvatar } from './RaterAvatar';
import { PlateIcon, StarIcon } from './icons';
import { BackButton, EmptyState, LoadingState } from './ui';
import { track } from '../lib/track';

type Result =
  { ok: true; data: FoodRatersResponse } | { ok: false; error: string };

/** A total in the top section, e.g. "8.7 / Average". */
const Stat = ({ value, label }: { value: ReactNode; label: string }) => (
  <div className="flex flex-1 flex-col items-center px-2 py-2.5">
    <span className="flex items-center gap-1 text-xl leading-none font-extrabold text-ink">
      {value}
    </span>
    <span className="mt-1 text-[11px] font-semibold text-muted">{label}</span>
  </div>
);

/**
 * Everyone who rated a food: the totals across all their ratings up top,
 * then a card per person with their best photo of it, their avatar and
 * how many they've rated. Tap a person to see their tier list for it.
 */
export const FoodRaters = ({
  food,
  refreshKey,
  onBack,
  onOpenUser,
}: {
  food: string;
  refreshKey: number;
  onBack: () => void;
  onOpenUser: (username: string) => void;
}) => {
  const [result, setResult] = useState<{ for: string } & Result>();

  useEffect(() => {
    let cancelled = false;
    fetchFoodRaters(food)
      .then((data) => !cancelled && setResult({ for: food, ok: true, data }))
      .catch((err: Error) => {
        if (!cancelled) setResult({ for: food, ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [food, refreshKey]);

  const current = result?.for === food ? result : undefined;
  const data = current?.ok ? current.data : null;

  return (
    <div className="relative isolate flex h-full min-h-0 flex-1 flex-col">
      <HeroBackdrop />
      <section className="shrink-0 px-3 pt-3">
        <div className="flex items-start gap-1.5">
          <BackButton onClick={onBack} />
          <div className="min-w-0 pt-0.5">
            <h1 className="truncate text-xl leading-tight font-extrabold text-ink">
              {food}
            </h1>
            <p className="truncate text-sm text-muted">Everyone who rated it</p>
          </div>
        </div>
        {/* Totals across every rating of this food, from everyone. */}
        {data && data.count > 0 && (
          <div className="rise mx-1 mt-3 flex divide-x divide-line rounded-2xl border border-line bg-surface shadow-sm backdrop-blur">
            <Stat
              value={
                <>
                  <StarIcon className="h-4 w-4 text-amber-400" />
                  {data.average.toFixed(1)}
                </>
              }
              label="Average rating"
            />
            <Stat value={data.count} label="Total ratings" />
            <Stat value={data.raters.length} label="People" />
          </div>
        )}
      </section>
      <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        {!current ? (
          <LoadingState />
        ) : !current.ok ? (
          <EmptyState>Couldn't load: {current.error}</EmptyState>
        ) : current.data.raters.length === 0 ? (
          <EmptyState>No {food} ratings yet.</EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {current.data.raters.map((rater, i) => (
              <li key={rater.username} className="rise" style={riseDelay(i)}>
                <button
                  onClick={() => {
                    track('rater_open');
                    onOpenUser(rater.username);
                  }}
                  aria-label={`u/${rater.username}: ${rater.count} ${food} ratings, top rating ${rater.best.rating} at ${rater.best.place}`}
                  className="flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm backdrop-blur cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Their top-rated photo of this food. */}
                  <span className="relative block aspect-[4/3] w-full bg-cta/15">
                    {rater.best.image ? (
                      <img
                        src={rater.best.image}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-cta">
                        <PlateIcon className="h-9 w-9" />
                      </span>
                    )}
                    {/* Their top rating of this food. */}
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-extrabold text-white backdrop-blur-sm">
                      <StarIcon className="h-3 w-3 text-amber-300" />
                      {rater.best.rating.toFixed(1)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 p-2.5">
                    <RaterAvatar url={rater.avatarUrl} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">
                        u/{rater.username}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {rater.count} {rater.count === 1 ? 'rating' : 'ratings'}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};
