import type { CSSProperties } from 'react';

/**
 * Soft layered waves in the theme colour, for the bottom of a page or behind
 * a hero. Stretches to its box; set the size and colour with `className`.
 */
export const Waves = ({
  className = '',
  flip = false,
}: {
  className?: string;
  /** Upside down, for the top of a box. */
  flip?: boolean;
}) => (
  <svg
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

/** Gold, silver and bronze, for places 1 to 3. */
const MEDAL_COLORS: Record<
  number,
  { face: string; ring: string; ribbon: [string, string] }
> = {
  1: { face: '#FFC83D', ring: '#E39E00', ribbon: ['#F59E0B', '#C77700'] },
  2: { face: '#D3DAE2', ring: '#97A3B0', ribbon: ['#A4B0BD', '#6F7C8A'] },
  3: { face: '#F2995E', ring: '#C2652A', ribbon: ['#EA7C3C', '#B4501D'] },
};

/** Medal with a ribbon and its place number (1 to 3). */
export const Medal = ({
  rank,
  className = '',
}: {
  rank: number;
  className?: string;
}) => {
  const colors = MEDAL_COLORS[rank];
  if (!colors) return null;
  return (
    <svg
      viewBox="0 0 40 48"
      role="img"
      aria-label={`Place ${rank}`}
      className={className}
    >
      {/* Ribbon tails behind the medal. */}
      <path d="M11 26 6 44l6-3 4 5 5-17Z" fill={colors.ribbon[1]} />
      <path d="M29 26l5 18-6-3-4 5-5-17Z" fill={colors.ribbon[0]} />
      <circle cx="20" cy="19" r="15" fill={colors.ring} />
      <circle cx="20" cy="19" r="11.5" fill={colors.face} />
      <circle
        cx="20"
        cy="19"
        r="11.5"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.45"
      />
      <text
        x="20"
        y="19.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontWeight="800"
        fill="#fff"
        style={{ paintOrder: 'stroke' }}
        stroke={colors.ring}
        strokeWidth="1.5"
      >
        {rank}
      </text>
    </svg>
  );
};

/** Two leafy branches curving up around the winner's medal. */
const Laurel = ({ className = '' }: { className?: string }) => {
  // Points along the left branch (bottom to top) and each leaf's tilt.
  const leaves = [
    { x: 22, y: 58, r: -70 },
    { x: 13, y: 49, r: -50 },
    { x: 8, y: 37, r: -30 },
    { x: 7, y: 25, r: -12 },
    { x: 10, y: 13, r: 8 },
  ];
  const branch = (
    <>
      <path
        d="M30 64C14 58 4 42 9 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {leaves.map((l) => (
        // A pointed leaf, pointing away from the stem.
        <path
          key={l.y}
          d="M0 0C-4-3-5-8-1-13 3-9 4-4 0 0Z"
          fill="currentColor"
          transform={`translate(${l.x} ${l.y}) rotate(${l.r - 20}) scale(0.95)`}
        />
      ))}
      {leaves.slice(1).map((l) => (
        <path
          key={`in${l.y}`}
          d="M0 0C-4-3-5-8-1-13 3-9 4-4 0 0Z"
          fill="currentColor"
          opacity="0.75"
          transform={`translate(${l.x + 1} ${l.y}) rotate(${l.r + 45}) scale(0.8)`}
        />
      ))}
    </>
  );
  return (
    <svg viewBox="0 0 120 66" aria-hidden className={className}>
      {branch}
      <g transform="translate(120 0) scale(-1 1)">{branch}</g>
    </svg>
  );
};

/** Little confetti dashes scattered around the podium. */
const CONFETTI: CSSProperties[] = [
  { left: '8%', top: '38%', rotate: '-30deg' },
  { left: '18%', top: '16%', rotate: '40deg' },
  { left: '30%', top: '6%', rotate: '-10deg' },
  { right: '9%', top: '34%', rotate: '25deg' },
  { right: '20%', top: '12%', rotate: '-40deg' },
  { right: '31%', top: '4%', rotate: '15deg' },
];

const PODIUM = [
  {
    rank: 2,
    medal: 'h-13 w-13 text-xl',
    block:
      'h-14 from-slate-200 to-slate-300 dark:from-slate-500/70 dark:to-slate-700/70',
  },
  {
    rank: 1,
    medal: 'h-16 w-16 text-3xl',
    block:
      'h-22 from-amber-200 to-amber-300 dark:from-amber-500/75 dark:to-amber-700/75',
  },
  {
    rank: 3,
    medal: 'h-12 w-12 text-lg',
    block:
      'h-10 from-orange-200 to-orange-300 dark:from-orange-500/70 dark:to-orange-700/70',
  },
];

/**
 * Winners' podium (2nd, 1st, 3rd) over soft waves. Places nobody has
 * reached yet are faded.
 */
export const Podium = ({ places }: { places: number }) => (
  <div aria-hidden className="relative isolate h-48 overflow-hidden">
    <Waves className="absolute inset-x-0 bottom-0 -z-10 h-36 w-full text-cta" />
    {CONFETTI.map((style, i) => (
      <span
        key={i}
        className="absolute h-1 w-3.5 rounded-full bg-cta/50"
        style={style}
      />
    ))}
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center px-6">
      {PODIUM.map(({ rank, medal, block }) => {
        const colors = MEDAL_COLORS[rank];
        return (
          <div
            key={rank}
            className={`flex w-full max-w-28 flex-col items-center transition-opacity ${
              rank > places ? 'opacity-35 grayscale' : ''
            }`}
          >
            <div className="relative z-10 -mb-3 flex flex-col items-center">
              {rank === 1 && (
                <Laurel className="absolute -top-2 left-1/2 h-18 w-28 -translate-x-1/2 text-amber-500" />
              )}
              <span
                className={`relative flex items-center justify-center rounded-full border-4 font-extrabold text-white shadow-lg ${medal}`}
                style={{
                  background: colors?.face,
                  borderColor: colors?.ring,
                  textShadow: `0 1px 2px ${colors?.ring ?? '#0004'}`,
                }}
              >
                {rank}
              </span>
            </div>
            <div
              className={`w-full rounded-t-xl bg-gradient-to-b shadow-inner ${block}`}
            />
          </div>
        );
      })}
    </div>
  </div>
);
