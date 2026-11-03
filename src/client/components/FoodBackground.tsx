import type { CSSProperties } from 'react';
import { ART_URL, FOOD_PATTERN_URL, useImageLoaded } from '../lib/art';
import { useTheme, type Surface } from '../lib/theme';

// The art is used as a mask and painted solid in the palette's art colour,
// so it always matches the chosen theme.
const artStyle = (palette: Surface): CSSProperties => {
  const mask = `url(${ART_URL})`;
  return {
    backgroundColor: palette.artColor,
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: 'cover',
    WebkitMaskSize: 'cover',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  };
};

/** A palette's background, optionally with the food art on top. */
export const ThemeSurface = ({
  palette,
  withArt = true,
  className = '',
}: {
  palette: Surface;
  withArt?: boolean;
  className?: string;
}) => (
  <div
    aria-hidden
    className={`pointer-events-none overflow-hidden ${className}`}
    style={{ background: palette.background }}
  >
    {withArt && <div className="absolute inset-0" style={artStyle(palette)} />}
  </div>
);

/** On-screen size of one pattern tile. */
const PATTERN_TILE_PX = 360;

// The doodles are a mask painted in the theme's text colour, so they follow
// light and dark mode (and palette changes) on their own.
const patternStyle: CSSProperties = {
  backgroundColor: 'var(--ink)',
  maskImage: `url(${FOOD_PATTERN_URL})`,
  WebkitMaskImage: `url(${FOOD_PATTERN_URL})`,
  // Tiled at a fixed size, like a chat wallpaper: the doodles stay the same
  // size on every screen. The 960px tile keeps them sharp on hi-res screens.
  maskSize: `${PATTERN_TILE_PX}px ${PATTERN_TILE_PX}px`,
  WebkitMaskSize: `${PATTERN_TILE_PX}px ${PATTERN_TILE_PX}px`,
  maskRepeat: 'repeat',
  WebkitMaskRepeat: 'repeat',
  maskPosition: 'top left',
  WebkitMaskPosition: 'top left',
};

/** Faint food doodles over the theme background; fades in once loaded. */
const FoodPattern = () => {
  const loaded = useImageLoaded(FOOD_PATTERN_URL);
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out ${
        loaded ? 'opacity-[0.08]' : 'opacity-0'
      }`}
      style={patternStyle}
    />
  );
};

/**
 * Full-page background for the selected theme: the splash art (`withArt`)
 * or the faint food doodles of the expanded app (`withPattern`).
 */
export const FoodBackground = ({
  withArt = false,
  withPattern = false,
}: {
  withArt?: boolean;
  withPattern?: boolean;
}) => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
    <ThemeSurface
      palette={useTheme()}
      withArt={withArt}
      className="absolute inset-0"
    />
    {withPattern && <FoodPattern />}
  </div>
);
