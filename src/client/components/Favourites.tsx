import { useEffect, useState } from 'react';
import { SectionHeading } from './Brand';
import {
  loadFavourites,
  toggleFavouriteUser,
  useFavourites,
} from '../lib/favourites';
import { riseDelay } from '../lib/motion';
import { HeartIcon } from './icons';
import { RaterAvatar } from './RaterAvatar';
import { FoodCard } from './TopRatedRow';
import { BackButton, LoadingState } from './ui';

/**
 * Your favourite people and food categories, newest first. Tap someone for
 * their ratings, a card for everyone's ratings of it, or a heart to take
 * it off.
 */
export const Favourites = ({
  onBack,
  onOpen,
  onOpenUser,
}: {
  onBack: () => void;
  onOpen: (food: string) => void;
  onOpenUser: (username: string) => void;
}) => {
  const { foods, users } = useFavourites();
  const [loaded, setLoaded] = useState(false);
  const empty = foods.length === 0 && users.length === 0;

  // Fresh counts, photos and avatars each time the screen opens.
  useEffect(() => {
    let cancelled = false;
    void loadFavourites(true).then(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <section className="flex shrink-0 items-start gap-1.5 px-3 pt-3">
        <BackButton onClick={onBack} />
        <div className="min-w-0 pt-0.5">
          <h1 className="truncate text-xl leading-tight font-extrabold text-ink">
            Favourites
          </h1>
          <p className="truncate text-sm text-muted">
            The people and dishes you love most
          </p>
        </div>
      </section>
      {!loaded && empty ? (
        <LoadingState />
      ) : empty ? (
        <main className="scroll-area flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-soft text-cta">
            <HeartIcon className="h-8 w-8" />
          </span>
          <SectionHeading>No favourites yet</SectionHeading>
          <p className="max-w-xs text-sm text-muted">
            Tap the heart on any category, or add someone from their ratings, to
            keep them here.
          </p>
        </main>
      ) : (
        <main className="scroll-area flex flex-1 flex-col gap-4 px-4 pt-3 pb-6">
          {users.length > 0 && (
            <section aria-label="People" className="flex flex-col gap-2">
              <SectionHeading>People</SectionHeading>
              <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {users.map((user, i) => (
                  <li
                    key={user.username}
                    className="rise group relative"
                    style={riseDelay(i)}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenUser(user.username)}
                      aria-label={`See u/${user.username}'s ratings`}
                      className="flex w-full flex-col items-center gap-1.5 cursor-pointer transition group-hover:-translate-y-0.5"
                    >
                      <RaterAvatar
                        url={user.avatarUrl}
                        className="h-14 w-14 ring-2 ring-cta/50"
                      />
                      <span className="w-full truncate text-center text-[11px] font-semibold text-ink">
                        {user.username}
                      </span>
                    </button>
                    {/* A sibling, not inside the button (buttons can't nest). */}
                    <button
                      type="button"
                      onClick={() => toggleFavouriteUser(user)}
                      aria-label={`Remove u/${user.username} from favourites`}
                      title="Remove from favourites"
                      className="absolute -top-1 left-1/2 ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-500 shadow-sm cursor-pointer transition group-hover:-translate-y-0.5 hover:scale-110 active:scale-95"
                    >
                      <HeartIcon className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {foods.length > 0 && (
            <section aria-label="Categories" className="flex flex-col gap-2">
              <SectionHeading>Categories</SectionHeading>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {foods.map((food, i) => (
                  <li
                    key={food.food}
                    className="rise h-44"
                    style={riseDelay(i)}
                  >
                    <FoodCard food={food} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      )}
    </div>
  );
};
