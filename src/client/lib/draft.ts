import type {
  CreateReviewRequest,
  UpdateReviewRequest,
} from '../../shared/api';
import { isValidRating } from '../../shared/food';
import type { ReviewDraft } from '../components/ReviewFields';

export const emptyDraft = (): ReviewDraft => ({
  title: '',
  food: '',
  place: '',
  location: undefined,
  rating: 0,
  review: '',
  budget: 0,
  vibes: [],
});

/** Food category, place and rating are required; the rest is optional. */
export const isDraftComplete = (draft: ReviewDraft) =>
  Boolean(
    draft.food.trim() && draft.place.trim() && isValidRating(draft.rating)
  );

/** Rate an existing post. */
export const draftToRequest = (
  { location, budget, ...draft }: ReviewDraft,
  importedPostId: string,
  coverImage?: string
): CreateReviewRequest => ({
  ...draft,
  ...(location ? { location } : {}),
  ...(budget ? { budget } : {}),
  importedPostId,
  ...(coverImage ? { coverImage } : {}),
});

/** Edit an existing rating. */
export const draftToUpdate = ({
  title,
  food,
  place,
  rating,
  review,
  budget,
  vibes,
}: ReviewDraft): UpdateReviewRequest => ({
  title,
  food,
  place,
  rating,
  review,
  ...(budget ? { budget } : {}),
  vibes,
});
