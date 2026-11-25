import { context, reddit } from '@devvit/web/server';
import {
  modAccessFrom,
  NO_MOD_ACCESS,
  type ModAccess,
} from '../../shared/modAccess';

/**
 * The current user's mod access in the subreddit the app is installed in,
 * checked with Reddit on every call (never by username).
 */
export const getModAccess = async (): Promise<ModAccess> => {
  const subredditName = context.subredditName;
  if (!subredditName) return NO_MOD_ACCESS;
  try {
    const user = await reddit.getCurrentUser();
    if (!user) return NO_MOD_ACCESS;
    return modAccessFrom(
      await user.getModPermissionsForSubreddit(subredditName)
    );
  } catch (error) {
    console.error('Mod permissions error:', error);
    return NO_MOD_ACCESS;
  }
};
