export type PaletteId =
  | 'cream'
  | 'sage'
  | 'lagoon'
  | 'saffron'
  | 'matcha'
  | 'peach'
  | 'berry'
  | 'vanilla'
  | 'chili'
  | 'blueberry'
  | 'espresso'
  | 'olive';

export const PALETTE_IDS: PaletteId[] = [
  'cream',
  'sage',
  'lagoon',
  'saffron',
  'matcha',
  'peach',
  'berry',
  'vanilla',
  'chili',
  'blueberry',
  'espresso',
  'olive',
];

export const isPaletteId = (value: unknown): value is PaletteId =>
  PALETTE_IDS.some((id) => id === value);

/** The expanded app's appearance. */
export type AppMode = 'light' | 'dark';

export const isAppMode = (value: unknown): value is AppMode =>
  value === 'light' || value === 'dark';
