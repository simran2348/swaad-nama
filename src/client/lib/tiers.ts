/** Badge colour for each tier, shared by the tier list and its legend. */
export const TIER_COLORS: Record<string, string> = {
  S: 'bg-rose-500',
  A: 'bg-orange-500',
  B: 'bg-amber-500',
  C: 'bg-lime-600',
  D: 'bg-sky-600',
};

/** A word for each tier, shown under the score. */
export const TIER_LABELS: Record<string, string> = {
  S: 'Excellent',
  A: 'Great',
  B: 'Good',
  C: 'Okay',
  D: 'Poor',
};

/** Text colour for each tier's label. */
export const TIER_TEXT: Record<string, string> = {
  S: 'text-emerald-600 dark:text-emerald-400',
  A: 'text-emerald-600 dark:text-emerald-400',
  B: 'text-amber-600 dark:text-amber-400',
  C: 'text-orange-600 dark:text-orange-400',
  D: 'text-rose-600 dark:text-rose-400',
};
