import type { PlaceLocation } from '../../shared/api';
import { BudgetInput } from './BudgetInput';
import { PlacePicker } from './PlacePicker';
import { RatingInput } from './RatingInput';
import { VibePicker } from './VibePicker';

export type ReviewDraft = {
  title: string;
  food: string;
  place: string;
  location: PlaceLocation | undefined;
  rating: number;
  review: string;
  /** Per person, in rupees; 0 = not given. */
  budget: number;
  vibes: string[];
};

const inputClass =
  'w-full rounded-lg border border-line bg-field px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cta';
const labelClass = 'flex flex-col gap-1 text-sm font-semibold text-ink';

/** The editable fields of a review, shared by "Add" and post import. */
export const ReviewFields = ({
  draft,
  onChange,
  foods,
  ratingOnly = false,
}: {
  draft: ReviewDraft;
  onChange: (patch: Partial<ReviewDraft>) => void;
  /** Existing food categories, offered as quick picks. */
  foods: string[];
  /** Only the rating part (food, café, rating, budget, vibes); title and text come from the post. */
  ratingOnly?: boolean;
}) => {
  const suggestions = foods
    .filter((f) => f.toLowerCase() !== draft.food.trim().toLowerCase())
    .slice(0, 8);

  return (
    <>
      {!ratingOnly && (
        <label className={labelClass}>
          Title
          <input
            className={inputClass}
            value={draft.title}
            maxLength={120}
            placeholder="e.g. Best ramen in town"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </label>
      )}

      <div className={labelClass}>
        <label htmlFor="food-category">Food category</label>
        <input
          id="food-category"
          className={inputClass}
          value={draft.food}
          maxLength={60}
          placeholder="e.g. Ramen, Biryani, Pizza"
          onChange={(e) => onChange({ food: e.target.value })}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((food) => (
              <button
                key={food}
                type="button"
                onClick={() => onChange({ food })}
                className="rounded-full border border-line bg-soft px-2.5 py-1 text-xs font-semibold text-soft-ink cursor-pointer hover:brightness-95"
              >
                {food}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={labelClass}>
        Café / restaurant
        <PlacePicker
          name={draft.place}
          location={draft.location}
          inputClass={inputClass}
          onChange={(place, location) => onChange({ place, location })}
        />
      </div>

      <div className={labelClass}>
        <span>
          Rating <span className="font-normal text-muted">out of 10</span>
        </span>
        <RatingInput
          value={draft.rating}
          onChange={(rating) => onChange({ rating })}
        />
      </div>

      <div className={labelClass}>
        <span>
          Budget{' '}
          <span className="font-normal text-muted">per person (optional)</span>
        </span>
        <BudgetInput
          value={draft.budget}
          onChange={(budget) => onChange({ budget })}
        />
      </div>

      <div className={labelClass}>
        <span>
          Vibes <span className="font-normal text-muted">(optional)</span>
        </span>
        <VibePicker
          value={draft.vibes}
          inputClass={inputClass}
          onChange={(vibes) => onChange({ vibes })}
        />
      </div>

      {!ratingOnly && (
        <label className={labelClass}>
          <span>
            Review <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            className={`${inputClass} min-h-28`}
            value={draft.review}
            maxLength={2000}
            placeholder="What made it good (or bad)?"
            onChange={(e) => onChange({ review: e.target.value })}
          />
        </label>
      )}
    </>
  );
};
