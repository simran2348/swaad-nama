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

/** Two stacked sheets, for "copy". */
export const CopyIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

/** Circled "i", for help text. */
export const InfoIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="7.75" r="0.6" fill="currentColor" />
  </svg>
);

/** Box with an outward arrow, for "open elsewhere". */
export const ExternalLinkIcon = ({
  className = '',
}: {
  className?: string;
}) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

/** Pencil, for "edit". */
export const PencilIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
  </svg>
);

/** Bin, for "delete". */
export const TrashIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

type IconProps = { className?: string };

/** Fork and knife, the placeholder when a dish has no photo. */
export const PlateIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10" />
    <path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3h3.5" />
  </svg>
);

/** Map pin, for addresses. */
export const PinIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

/** Calendar, for dates. */
export const CalendarIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

/** Left arrow, for "back". */
export const ArrowLeftIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

/** Right arrow, for "next". */
export const ArrowRightIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** Cross, for "close" or "clear". */
export const CloseIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} strokeWidth={2.5} aria-hidden className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/** Tick, for "selected" or "done". */
export const CheckIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} strokeWidth={3} aria-hidden className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Sun, for light mode. */
export const SunIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);

/** Crescent moon, for dark mode. */
export const MoonIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

/** Envelope, for messages. */
export const MailIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>
);

/** Wrench, for admin tools. */
export const WrenchIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8Z" />
  </svg>
);

/** Shield, for mod actions. */
export const ShieldIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6L12 3Z" />
  </svg>
);

/** Circled tick, for success. */
export const CheckCircleIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.8 2.8L16.5 9.5" />
  </svg>
);

/** Circled cross, for failure. */
export const XCircleIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </svg>
);

/** Upward arrow, for upvotes. */
export const UpvoteIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} strokeWidth={2.5} aria-hidden className={className}>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </svg>
);

/** Rising line, for "trending". */
export const TrendingIcon = ({ className = '' }: IconProps) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />
  </svg>
);

/** Solid star, for average ratings. */
export const StarIcon = ({ className = '' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    className={className}
  >
    <path d="M12 2.8 14.8 8.6l6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
  </svg>
);

/** Two people, for the rater lists. */
export const UsersIcon = ({ className = '' }: { className?: string }) => (
  <svg {...strokeProps} aria-hidden className={className}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
    <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2.1.6 3.6 2.4 4 5.2" />
  </svg>
);
