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
});

/** Food category, place and rating are required; the rest is optional. */
export const isDraftComplete = (draft: ReviewDraft) =>
  Boolean(
    draft.food.trim() && draft.place.trim() && isValidRating(draft.rating)
  );

/** Rate an existing post. */
export const draftToRequest = (
  { location, ...draft }: ReviewDraft,
  importedPostId: string,
  coverImage?: string
): CreateReviewRequest => ({
  ...draft,
  ...(location ? { location } : {}),
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
}: ReviewDraft): UpdateReviewRequest => ({
  title,
  food,
  place,
  rating,
  review,
});
