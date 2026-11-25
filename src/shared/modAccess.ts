/**
 * What a user may do with SwaadNama's mod tools in the subreddit it's
 * installed in, from their Reddit mod permissions there. Nobody gets mod
 * tools by username: only this subreddit's own moderators.
 */
export type ModAccess = {
  /** A moderator of this subreddit: sees Mod tools and its stats. */
  isMod: boolean;
  /**
   * Has the "Manage Posts & Comments" permission (or "Everything"): may
   * remove posts and reset members' SwaadNama data.
   */
  canManage: boolean;
};

export const NO_MOD_ACCESS: ModAccess = { isMod: false, canManage: false };

/** Mod permissions that allow removing posts and resetting member data. */
export const MANAGE_PERMISSIONS: readonly string[] = ['all', 'posts'];

/** Mod access from a user's mod permissions here (none for non-mods). */
export const modAccessFrom = (permissions: readonly string[]): ModAccess => ({
  isMod: permissions.length > 0,
  canManage: permissions.some((p) => MANAGE_PERMISSIONS.includes(p)),
});
