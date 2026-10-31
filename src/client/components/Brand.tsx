import {
  LOGO_HAT,
  LOGO_HAT_FILL,
  LOGO_HAT_SHADE,
  LOGO_NAMA,
  LOGO_SWAAD,
  LOGO_VIEWBOX,
  SWIRL_LEFT_VIEWBOX,
  SWIRL_RIGHT_VIEWBOX,
  TAGLINE_SWIRLS,
} from '../lib/brandArt';

/** The hat's base (bottom centre) in the logo's coordinates. */
const HAT_BASE = { x: 836, y: 629 };
const HAT_SCALE = 0.85;
const HAT_TRANSFORM = `translate(${HAT_BASE.x} ${HAT_BASE.y}) scale(${HAT_SCALE}) translate(${-HAT_BASE.x} ${-HAT_BASE.y})`;

/**
 * The स्वाद Nama logo. The hat is cream with a thin black outline on every
 * theme; "Nama" uses the theme's orange and स्वाद its text colour.
 */
export const BrandLogo = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox={LOGO_VIEWBOX}
    role="img"
    aria-label="SwaadNama"
    className={className}
  >
    {/* Hat drawn a little smaller, shrunk around its base so it still
        sits in the same place on स्वाद. */}
    <g transform={HAT_TRANSFORM}>
      <path fill="#fcf6ea" d={LOGO_HAT_FILL} />
      <path fill="#ecd3a6" d={LOGO_HAT_SHADE} />
      <path fill="#141414" fillRule="evenodd" d={LOGO_HAT} />
    </g>
    <path className="fill-ink" fillRule="evenodd" d={LOGO_SWAAD} />
    <path className="fill-cta" fillRule="evenodd" d={LOGO_NAMA} />
  </svg>
);

const Swirl = ({ viewBox }: { viewBox: string }) => (
  <svg viewBox={viewBox} aria-hidden className="h-auto w-12 shrink-0">
    <path className="fill-cta" fillRule="evenodd" d={TAGLINE_SWIRLS} />
  </svg>
);

/** "A tale of taste" in the app font, between orange swirls. */
export const BrandTagline = ({ className = '' }: { className?: string }) => (
  <p
    className={`flex items-center gap-2 text-lg font-extrabold text-ink ${className}`}
  >
    <Swirl viewBox={SWIRL_LEFT_VIEWBOX} />
    A tale of taste
    <Swirl viewBox={SWIRL_RIGHT_VIEWBOX} />
  </p>
);
