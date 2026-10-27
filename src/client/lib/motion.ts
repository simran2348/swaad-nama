import type { CSSProperties } from 'react';

/**
 * Staggered entrance delay for the `rise` animation. Cycles every
 * `perPage` items so rows added by "Load more" don't wait behind earlier ones.
 */
export const riseDelay = (index: number, perPage = 8): CSSProperties => ({
  animationDelay: `${(index % perPage) * 45}ms`,
});
