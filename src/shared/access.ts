/** The "App status" subreddit setting. */
export type AppStatus = 'open' | 'closed';

/** Reads the setting's stored value; anything unexpected counts as open. */
export const toAppStatus = (value: unknown): AppStatus => {
  // Select settings are stored as a list of the chosen values.
  const choice = Array.isArray(value) ? value[0] : value;
  return choice === 'closed' ? 'closed' : 'open';
};

/**
 * Whether someone may use the app: everyone when open; when closed, only
 * this subreddit's moderators (so they can try it out first).
 */
export const canUseApp = (status: AppStatus, isMod: boolean) =>
  status === 'open' || isMod;
