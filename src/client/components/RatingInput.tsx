import { useState } from 'react';
import {
  MAX_RATING,
  MIN_RATING,
  isValidRating,
  tierFor,
} from '../../shared/food';
import { TIER_COLORS } from '../lib/tiers';

const TIER_LABELS: Record<string, string> = {
  S: 'Outstanding',
  A: 'Great',
  B: 'Good',
  C: 'Okay',
  D: 'Skip it',
};

/** Keeps digits and a single decimal point, with at most one decimal. */
const sanitize = (text: string) => {
  const [whole = '', ...rest] = text.replace(/[^\d.]/g, '').split('.');
  return rest.length
    ? `${whole.slice(0, 2)}.${rest.join('').slice(0, 1)}`
    : whole.slice(0, 2);
};

/**
 * Rating out of 10 with one decimal: type it, or drag the bar. The bar fills
 * and recolours by tier as the value changes. Reports 0 while the input
 * isn't a valid rating.
 */
export const RatingInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) => {
  const [text, setText] = useState(value ? String(value) : '');
  const parsed = Number(text);
  const valid = text !== '' && isValidRating(parsed);
  const tier = valid ? tierFor(parsed) : null;
  // Matches the range input's geometry: 1 at the left edge, 10 at the right.
  const fill = valid
    ? ((parsed - MIN_RATING) / (MAX_RATING - MIN_RATING)) * 100
    : 0;

  const setFromText = (next: string) => {
    const clean = sanitize(next);
    setText(clean);
    const n = Number(clean);
    onChange(clean !== '' && isValidRating(n) ? n : 0);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <div className="relative w-28">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            placeholder="e.g. 8.5"
            aria-label={`Rating from ${MIN_RATING} to ${MAX_RATING}`}
            onChange={(e) => setFromText(e.target.value)}
            className={`w-full rounded-lg border bg-field py-2 pr-10 pl-3 text-lg font-extrabold text-ink placeholder:text-sm placeholder:font-normal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cta ${
              text && !valid ? 'border-rose-500' : 'border-line'
            }`}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-muted">
            /10
          </span>
        </div>
        {tier ? (
          <span className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-extrabold text-white shadow-sm transition-colors ${TIER_COLORS[tier]}`}
            >
              {tier}
            </span>
            <span className="text-sm font-bold text-ink">
              {TIER_LABELS[tier]}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted">
            {text ? 'Use 1 – 10, one decimal' : 'Type or drag below'}
          </span>
        )}
      </div>

      {/* Draggable bar: a styled track with an invisible range input on top. */}
      <div className="relative h-4">
        <div className="absolute inset-y-1 inset-x-0 overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out ${
              tier ? TIER_COLORS[tier] : 'bg-cta'
            }`}
            style={{ width: `${fill}%` }}
          />
        </div>
        {valid && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow-md transition-[left] duration-300 ease-out"
            style={{ left: `${fill}%` }}
          />
        )}
        <input
          type="range"
          min={MIN_RATING}
          max={MAX_RATING}
          step={0.1}
          value={valid ? parsed : MIN_RATING}
          aria-label="Rating slider"
          onChange={(e) => setFromText(Number(e.target.value).toFixed(1))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between px-0.5 text-[10px] font-semibold text-muted">
        <span>{MIN_RATING}</span>
        <span>{MAX_RATING}</span>
      </div>
    </div>
  );
};
