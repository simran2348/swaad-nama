import type { SVGProps } from 'react';

/** Solid cog (Heroicons "cog-6-tooth"); takes the current text colour. */
export const CogIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
    />
  </svg>
);

const strokeProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Bulleted list, for the "My Food" tab. */
export const ListIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4" cy="6" r="1.25" fill="currentColor" />
    <circle cx="4" cy="12" r="1.25" fill="currentColor" />
    <circle cx="4" cy="18" r="1.25" fill="currentColor" />
  </svg>
);

/** Magnifying glass, for search boxes. */
export const SearchIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/** Folded map, for the "Map" tab. */
export const MapIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

/** Trophy, for the "Ratings" tab. */
export const TrophyIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
  </svg>
);

/** Plus sign, for "add to tier". */
export const PlusIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} strokeWidth={2.5} aria-hidden className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Minus sign, for "remove from selection". */
export const MinusIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} strokeWidth={2.5} aria-hidden className={className}>
    <path d="M5 12h14" />
  </svg>
);
