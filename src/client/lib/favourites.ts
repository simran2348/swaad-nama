import { showToast } from '@devvit/web/client';
import { useEffect, useSyncExternalStore } from 'react';
import type { RaterCard, TopRatedFood } from '../../shared/api';
import { normalizeName } from '../../shared/food';
import { fetchFavourites, saveFavourite, saveFavouriteUser } from './api';

/**
 * Your favourite food categories and people, shared by every heart on
 * screen so they all stay in step. Loaded once; a tap updates straight away
 * and saves in the background (undone if saving fails).
 */
type State = {
  foods: TopRatedFood[];
  users: RaterCard[];
  foodKeys: Set<string>;
  userKeys: Set<string>;
};

const userKey = (username: string) => username.toLowerCase();

let state: State = {
  foods: [],
  users: [],
  foodKeys: new Set(),
  userKeys: new Set(),
};
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const set = (foods: TopRatedFood[], users: RaterCard[]) => {
  state = {
    foods,
    users,
    foodKeys: new Set(foods.map((f) => normalizeName(f.food))),
    userKeys: new Set(users.map((u) => userKey(u.username))),
  };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Loads your favourites (once; `force` reloads them). */
export const loadFavourites = (force = false) => {
  if (!loading || force) {
    loading = fetchFavourites()
      .then((res) => set(res.foods, res.users))
      .catch((err: unknown) => {
        console.error('Favourites failed', err);
        loading = null;
      });
  }
  return loading;
};

const useLoaded = () => {
  useEffect(() => {
    void loadFavourites();
  }, []);
};

/** Your favourite categories and people, newest first. */
export const useFavourites = () => {
  useLoaded();
  return useSyncExternalStore(subscribe, () => state);
};

/** Whether this food category is one of your favourites. */
export const useIsFavourite = (food: string) => {
  useLoaded();
  return useSyncExternalStore(subscribe, () =>
    state.foodKeys.has(normalizeName(food))
  );
};

/** Whether this person is one of your favourites. */
export const useIsFavouriteUser = (username: string) => {
  useLoaded();
  return useSyncExternalStore(subscribe, () =>
    state.userKeys.has(userKey(username))
  );
};

/** Adds a category to your favourites, or takes it off. */
export const toggleFavourite = (food: TopRatedFood) => {
  const before = state;
  const key = normalizeName(food.food);
  const adding = !before.foodKeys.has(key);
  set(
    adding
      ? [food, ...before.foods]
      : before.foods.filter((f) => normalizeName(f.food) !== key),
    before.users
  );
  showToast(
    adding
      ? `${food.food} added to favourites`
      : `${food.food} removed from favourites`
  );
  saveFavourite({ food: food.food, favourite: adding }).catch((err: Error) => {
    set(before.foods, before.users);
    showToast(`Couldn't update favourites: ${err.message}`);
  });
};

/** Adds someone to your favourites, or takes them off. */
export const toggleFavouriteUser = (user: RaterCard) => {
  const before = state;
  const key = userKey(user.username);
  const adding = !before.userKeys.has(key);
  set(
    before.foods,
    adding
      ? [user, ...before.users]
      : before.users.filter((u) => userKey(u.username) !== key)
  );
  showToast(
    adding
      ? `u/${user.username} added to favourites`
      : `u/${user.username} removed from favourites`
  );
  saveFavouriteUser({ username: user.username, favourite: adding }).catch(
    (err: Error) => {
      set(before.foods, before.users);
      showToast(`Couldn't update favourites: ${err.message}`);
    }
  );
};
