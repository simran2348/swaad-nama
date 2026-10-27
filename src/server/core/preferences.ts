import { redis } from '@devvit/web/server';
import {
  isAppMode,
  isPaletteId,
  type AppMode,
  type PaletteId,
} from '../../shared/theme';

const themeKey = (username: string) => `user:${username}:theme`;

export const getUserTheme = async (
  username: string
): Promise<PaletteId | null> => {
  const value = await redis.get(themeKey(username));
  return isPaletteId(value) ? value : null;
};

export const saveUserTheme = async (username: string, palette: PaletteId) => {
  await redis.set(themeKey(username), palette);
};

const modeKey = (username: string) => `user:${username}:mode`;

/** The user's light/dark choice for the expanded app, if they've made one. */
export const getUserMode = async (
  username: string
): Promise<AppMode | null> => {
  const value = await redis.get(modeKey(username));
  return isAppMode(value) ? value : null;
};

export const saveUserMode = async (username: string, mode: AppMode) => {
  await redis.set(modeKey(username), mode);
};
