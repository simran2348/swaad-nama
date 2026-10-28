import type { AppMode, PaletteId } from './theme';

/** A spot picked from place search; drives the map. */
export type PlaceLocation = {
  /** Full address line, e.g. "12 High St, London, United Kingdom". */
  address: string;
  lat: number;
  lon: number;
};

export type FoodReview = {
  id: string;
  username: string;
  /** Short headline; for imported posts, the post's title. */
  title: string;
  food: string;
  /** Café / restaurant name. */
  place: string;
  location?: PlaceLocation;
  /** Out of {@link MAX_RATING} (10). */
  rating: number;
  review: string;
  /** Rough spend per person, in rupees (see `MAX_BUDGET` for "or more"). */
  budget?: number;
  /** Short tags like "Hidden gem" (up to 10). */
  vibes: string[];
  /** Photo URLs (Reddit-hosted), from an imported post. */
  images: string[];
  /** When the review was saved in SwaadNama. */
  createdAt: number;
  /** When the meal was posted; for imports, the original post's date. */
  postedAt: number;
  postId?: string;
};

/** A food category with its best-rated place. */
export type FoodCategory = {
  food: string;
  /** Number of ratings in this category. */
  count: number;
  top: { place: string; rating: number; image: string | null } | null;
};

export type CategoriesResponse = {
  /** Whose ratings these are (the viewer unless one was searched). */
  username: string | null;
  categories: FoodCategory[];
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};

/** What the inline splash needs: kept small so the feed view loads fast. */
export type ProfileResponse = {
  username: string | null;
  avatarUrl: string | null;
  /** The user's saved palette, if they've picked one. */
  theme: PaletteId | null;
};

export type InitResponse = {
  username: string | null;
  subredditName: string;
  /** The user's saved light/dark choice, if they've made one. */
  mode: AppMode | null;
  myList: FoodReview[];
  foods: string[];
};

export type UserReviewsResponse = {
  username: string;
  reviews: FoodReview[];
};

export type SaveThemeRequest = {
  palette: PaletteId;
};

export type SaveModeRequest = {
  mode: AppMode;
};

/** Rate one of your existing posts (from My List). */
export type CreateReviewRequest = {
  title: string;
  food: string;
  place: string;
  location?: PlaceLocation;
  rating: number;
  review: string;
  budget?: number;
  vibes?: string[];
  importedPostId: string;
  /** Which of the post's photos to show for the rating (defaults to the first). */
  coverImage?: string;
};

/** The fields a user can change on their own rating. */
export type UpdateReviewRequest = {
  title: string;
  food: string;
  place: string;
  /** Left out to clear it. */
  location?: PlaceLocation;
  rating: number;
  review: string;
  /** Left out to clear it. */
  budget?: number;
  vibes: string[];
};

/** A post's content, for the popup viewer. */
export type PostDetailResponse = {
  postId: string;
  title: string;
  body: string;
  images: string[];
  postedAt: number;
  author: string;
};

export type AdminDeletePostsResponse = {
  results: {
    id: string;
    /** deleted = removed for good (app's own post); removed = mod-removed. */
    status: 'deleted' | 'removed' | 'failed';
    message?: string;
  }[];
};

export type AdminResetRatingsResponse = {
  username: string;
  removed: number;
};

/** An existing Reddit post, pre-filled into the add form. */
export type ImportPostResponse = {
  postId: string;
  title: string;
  body: string;
  images: string[];
  postedAt: number;
};

/** A user's posts in this subreddit (yours can be added to the tier). */
export type MyPostsResponse = {
  /** Whose posts these are. */
  username: string;
  posts: {
    postId: string;
    title: string;
    image: string | null;
    postedAt: number;
    /** The owner's rating of this post, or null if not rated yet. */
    rating: number | null;
  }[];
  /** Pass as `after` to load the next page; null when there are no more. */
  nextCursor: string | null;
};

/** A popular recent post, for the trending row on My List. */
export type TrendingPost = {
  postId: string;
  title: string;
  image: string;
  author: string;
  /** Upvotes (Reddit's score). */
  score: number;
  comments: number;
  postedAt: number;
};

export type TrendingResponse = {
  /** Where the posts come from. */
  subredditName: string;
  /** How far back the posts go: 1, 3 or 7 days (widened on quiet days). */
  days: number;
  posts: TrendingPost[];
};

/** The area a subreddit covers (a mod setting), for framing the map. */
export type MapArea = {
  name: string;
  lat: number;
  lon: number;
  /** Zoom to use when there are no bounds (e.g. a city given as a point). */
  zoom: number;
  bounds: { south: number; west: number; north: number; east: number } | null;
};

export type MapAreaResponse = {
  area: MapArea | null;
};

export type PlaceSearchResponse = {
  places: (PlaceLocation & { name: string })[];
};

export type CreateReviewResponse = {
  review: FoodReview;
  postUrl: string | null;
};
