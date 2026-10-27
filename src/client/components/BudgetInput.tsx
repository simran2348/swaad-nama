import {
  BUDGET_STEP,
  MAX_BUDGET,
  MIN_BUDGET,
  formatBudget,
} from '../../shared/food';

/**
 * Per-person budget on a slider, styled like the rating bar. 0 means not
 * set: the bar sits empty until dragged, and "Clear" resets it.
 */
export const BudgetInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (budget: number) => void;
}) => {
  const set = value > 0;
  const fill = set
    ? ((value - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 100
    : 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-lg font-extrabold ${set ? 'text-ink' : 'text-sm font-normal text-muted'}`}
        >
          {set ? formatBudget(value) : 'Drag to set'}
        </span>
        {set && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-xs font-semibold text-muted cursor-pointer hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {/* A styled track with an invisible range input on top. */}
      <div className="relative h-4">
        <div className="absolute inset-y-1 inset-x-0 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-cta transition-[width] duration-200 ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>
        {set && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow-md transition-[left] duration-200 ease-out"
            style={{ left: `${fill}%` }}
          />
        )}
        <input
          type="range"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={BUDGET_STEP}
          value={set ? value : MIN_BUDGET}
          aria-label="Budget per person"
          aria-valuetext={set ? formatBudget(value) : 'Not set'}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between px-0.5 text-[10px] font-semibold text-muted">
        <span>{formatBudget(MIN_BUDGET)}</span>
        <span>{formatBudget(MAX_BUDGET)}</span>
      </div>
    </div>
  );
};
