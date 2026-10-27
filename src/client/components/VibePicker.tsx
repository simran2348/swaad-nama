import { useState } from 'react';
import {
  MAX_VIBE_LENGTH,
  MAX_VIBES,
  VIBE_PRESETS,
  cleanVibe,
} from '../../shared/food';

const chipClass =
  'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40';
const onClass = 'border-cta bg-cta text-cta-ink';
const offClass = 'border-line bg-soft text-soft-ink hover:brightness-95';

/**
 * Vibe tags: tap the presets, or type your own and press Enter (or Add) to
 * turn it into a tag. Up to {@link MAX_VIBES}.
 */
export const VibePicker = ({
  value,
  onChange,
  inputClass,
}: {
  value: string[];
  onChange: (vibes: string[]) => void;
  inputClass: string;
}) => {
  const [text, setText] = useState('');
  const full = value.length >= MAX_VIBES;
  const has = (vibe: string) =>
    value.some((v) => v.toLowerCase() === vibe.toLowerCase());
  const remove = (vibe: string) =>
    onChange(value.filter((v) => v.toLowerCase() !== vibe.toLowerCase()));
  const toggle = (vibe: string) =>
    has(vibe) ? remove(vibe) : !full && onChange([...value, vibe]);

  const addTyped = () => {
    const vibe = cleanVibe(text);
    if (!vibe || full) return;
    if (!has(vibe)) onChange([...value, vibe]);
    setText('');
  };

  // Your own tags (not presets) are listed first so they can be removed.
  const custom = value.filter(
    (v) => !VIBE_PRESETS.some((p) => p.toLowerCase() === v.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {custom.map((vibe) => (
          <button
            key={vibe}
            type="button"
            onClick={() => remove(vibe)}
            aria-label={`Remove ${vibe}`}
            className={`${chipClass} ${onClass}`}
          >
            {vibe} <span aria-hidden>×</span>
          </button>
        ))}
        {VIBE_PRESETS.map((vibe) => {
          const on = has(vibe);
          return (
            <button
              key={vibe}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(vibe)}
              className={`${chipClass} ${on ? onClass : offClass}`}
            >
              {vibe}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={text}
          maxLength={MAX_VIBE_LENGTH}
          disabled={full}
          placeholder={full ? 'That’s 10 vibes!' : 'Add your own vibe'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTyped();
            }
          }}
        />
        <button
          type="button"
          onClick={addTyped}
          disabled={full || !cleanVibe(text)}
          className="shrink-0 rounded-lg bg-cta px-4 text-sm font-bold text-cta-ink cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-muted">
        {value.length}/{MAX_VIBES} picked
      </p>
    </div>
  );
};
