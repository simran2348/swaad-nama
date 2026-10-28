import { showToast } from '@devvit/web/client';
import { saveTheme } from '../lib/api';
import { PALETTES, setPalette, useTheme, type Palette } from '../lib/theme';
import { ThemeSurface } from './FoodBackground';
import { CheckIcon } from './icons';

const choosePalette = (palette: Palette) => {
  setPalette(palette);
  // Saved to the user's account so the theme follows them on every visit.
  saveTheme({ palette: palette.id }).catch((err: unknown) => {
    console.error('Failed to save theme', err);
    showToast("Couldn't save your theme. It'll reset next time.");
  });
};

/** Splash colour palettes as a grid of previews; the current one is ticked. */
export const PalettePicker = () => {
  const current = useTheme();
  return (
    <div className="grid grid-cols-3 gap-2">
      {PALETTES.map((p) => {
        const active = p === current;
        return (
          <button
            key={p.id}
            onClick={() => !active && choosePalette(p)}
            aria-pressed={active}
            className={`flex min-w-0 flex-col gap-1 rounded-xl p-1 text-left cursor-pointer transition-colors ${
              active
                ? 'bg-cta/10 ring-2 ring-cta'
                : 'ring-1 ring-line hover:bg-soft'
            }`}
          >
            <span className="relative block">
              <ThemeSurface palette={p} className="relative h-10 rounded-lg" />
              {active && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cta text-[11px] font-bold text-cta-ink shadow-md">
                  <CheckIcon className="h-3 w-3" />
                </span>
              )}
            </span>
            <span
              className={`truncate px-1 text-xs ${
                active ? 'font-extrabold text-cta' : 'font-semibold text-ink'
              }`}
            >
              {p.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
