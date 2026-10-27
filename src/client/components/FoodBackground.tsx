import type { CSSProperties } from 'react';
import { ART_URL } from '../lib/art';
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

/** Full-page background for the selected theme. */
export const FoodBackground = ({ withArt = false }: { withArt?: boolean }) => (
  <ThemeSurface
    palette={useTheme()}
    withArt={withArt}
    className="fixed inset-0 -z-10"
  />
);
