import type { CSSProperties } from 'react';
import { MEDAL_IMAGES, PODIUM_IMAGE } from '../lib/art';

/**
 * Soft layered waves in the theme colour, for the bottom of a page or behind
 * a hero. Stretches to its box; set the size and colour with `className`.
 */
export const Waves = ({
  className = '',
  flip = false,
  style,
}: {
  className?: string;
  /** Upside down, for the top of a box. */
  flip?: boolean;
  style?: CSSProperties;
}) => (
  <svg
    style={style}
    viewBox="0 0 400 120"
    preserveAspectRatio="none"
    aria-hidden
    className={`pointer-events-none ${flip ? 'rotate-180' : ''} ${className}`}
  >
    <path
      d="M0 58C46 34 92 30 142 46s96 34 150 22 76-34 108-30v82H0Z"
      fill="currentColor"
      opacity="0.08"
    />
    <path
      d="M0 78c52-20 104-22 156-6s92 26 140 14 72-24 104-20v54H0Z"
      fill="currentColor"
      opacity="0.12"
    />
    <path
      d="M0 98c60-14 118-12 170 0s96 14 134 4 66-14 96-10v28H0Z"
      fill="currentColor"
      opacity="0.16"
    />
  </svg>
);

/** Medal image for places 1 to 3 (nothing for other places). */
export const Medal = ({
  rank,
  className = '',
}: {
  rank: number;
  className?: string;
}) => {
  const src = MEDAL_IMAGES[rank];
  if (!src) return null;
  return (
    <img
      src={src}
      width={260}
      height={355}
      alt={`Place ${rank}`}
      draggable={false}
      className={`object-contain ${className}`}
    />
  );
};

/** A spray of three soft leaves fanning up from the bottom centre. */
const LeafSpray = ({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => (
  <svg viewBox="0 0 60 80" aria-hidden className={className} style={style}>
    <path
      d="M30 80C10 64 2 40 10 14c14 16 22 40 20 66Z"
      fill="currentColor"
      opacity="0.7"
    />
    <path d="M30 80C24 56 26 28 38 4c10 22 6 52-8 76Z" fill="currentColor" />
    <path
      d="M30 80c6-20 16-36 30-44 0 20-12 36-30 44Z"
      fill="currentColor"
      opacity="0.8"
    />
  </svg>
);

/** Confetti dashes around the podium, as % of its box, with a tilt. */
const PODIUM_CONFETTI: CSSProperties[] = [
  { left: '15%', top: '30%', rotate: '55deg' },
  { left: '9%', top: '58%', rotate: '25deg' },
  { left: '30%', top: '12%', rotate: '-35deg' },
  { right: '13%', top: '50%', rotate: '-50deg' },
  { right: '26%', top: '16%', rotate: '30deg' },
  { right: '6%', top: '30%', rotate: '70deg' },
];

/**
 * The podium picture over a soft glow, with leaf sprays and confetti drawn
 * in the theme colour so they suit light and dark mode.
 */
export const PodiumArt = ({ className = '' }: { className?: string }) => (
  <div aria-hidden className={`relative isolate ${className}`}>
    <LeafSpray
      className="absolute bottom-0 left-[1%] -z-10 w-[13%] text-amber-300/60 dark:text-amber-500/40"
      style={{ rotate: '-18deg' }}
    />
    <LeafSpray
      className="absolute right-[1%] bottom-0 -z-10 w-[13%] -scale-x-100 text-amber-300/60 dark:text-amber-500/40"
      style={{ rotate: '18deg' }}
    />
    {PODIUM_CONFETTI.map((style, i) => (
      <span
        key={i}
        className={`absolute -z-10 h-[3%] min-h-1 w-[4.5%] rounded-full ${
          i % 2 ? 'bg-cta/60' : 'bg-amber-400/80'
        }`}
        style={style}
      />
    ))}
    <img
      {...PODIUM_IMAGE}
      alt=""
      draggable={false}
      className="block h-auto w-full"
    />
  </div>
);

/**
 * Full-width glow and waves behind the ranking hero, header included. Both
 * fade out at the bottom, so there's no edge where the list starts. Place
 * it as the first child of a `relative isolate` screen.
 */
export const HeroBackdrop = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
    style={{
      background:
        'radial-gradient(ellipse 90% 75% at 50% 42%, color-mix(in srgb, var(--cta) 18%, transparent), transparent 72%)',
    }}
  >
    <Waves
      className="absolute inset-x-0 top-24 h-44 w-full text-cta"
      style={{
        maskImage: 'linear-gradient(to bottom, #000 45%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 45%, transparent)',
      }}
    />
  </div>
);
