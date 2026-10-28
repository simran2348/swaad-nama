import type {
  AdminDeletePostsResponse,
  AdminResetRatingsResponse,
  FoodReview,
  PostDetailResponse,
  UpdateReviewRequest,
  CategoriesResponse,
  CreateReviewRequest,
  CreateReviewResponse,
  ErrorResponse,
  ImportPostResponse,
  InitResponse,
  MapAreaResponse,
  TeamResponse,
  TopRatedResponse,
  FoodRatersResponse,
  TrendingResponse,
  MyPostsResponse,
  PlaceLinkResponse,
  PlaceSearchResponse,
  ProfileResponse,
  SaveModeRequest,
  SaveThemeRequest,
  UserReviewsResponse,
} from '../../shared/api';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const error: Partial<ErrorResponse> = await res.json().catch(() => ({}));
    throw new Error(error.message ?? `Request failed (${res.status})`);
  }
  const data: T = await res.json();
  return data;
};

export const fetchProfile = () => request<ProfileResponse>('/api/profile');

export const fetchInit = () => request<InitResponse>('/api/init');

export const fetchUserReviews = (username: string) =>
  request<UserReviewsResponse>(
    `/api/users/${encodeURIComponent(username)}/reviews`
  );

export const saveMode = (body: SaveModeRequest) =>
  request<{ status: 'ok' }>('/api/mode', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const saveTheme = (body: SaveThemeRequest) =>
  request<{ status: 'ok' }>('/api/theme', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** A page of posts in this subreddit: yours, or `user`'s. */
export const fetchMyPosts = (after?: string, user?: string) => {
  const params = new URLSearchParams({
    ...(after ? { after } : {}),
    ...(user ? { user } : {}),
  });
  return request<MyPostsResponse>(`/api/my-posts?${params}`);
};

/** Loads one of your posts (picked in My List) to rate it. */
export const importPost = (postId: string) =>
  request<ImportPostResponse>(
    `/api/import?${new URLSearchParams({ id: postId })}`
  );

export const fetchTopRated = () => request<TopRatedResponse>('/api/top-rated');

export const fetchFoodRaters = (food: string) =>
  request<FoodRatersResponse>(`/api/foods/${encodeURIComponent(food)}/raters`);

export const fetchTeam = () => request<TeamResponse>('/api/team');

export const fetchTrending = () => request<TrendingResponse>('/api/trending');

export const fetchMapArea = () => request<MapAreaResponse>('/api/map-area');

/** A place from a pasted Google Maps link. */
export const placeFromLink = (url: string) =>
  request<PlaceLinkResponse>(
    `/api/places/from-link?${new URLSearchParams({ url })}`
  );

export const searchPlaces = (query: string) =>
  request<PlaceSearchResponse>(`/api/places?q=${encodeURIComponent(query)}`);

/** Your food categories, or `user`'s when given. */
export const fetchCategories = (user?: string) =>
  request<CategoriesResponse>(
    user
      ? `/api/categories?user=${encodeURIComponent(user)}`
      : '/api/categories'
  );

export const createReview = (body: CreateReviewRequest) =>
  request<CreateReviewResponse>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const fetchPost = (postId: string) =>
  request<PostDetailResponse>(`/api/posts/${encodeURIComponent(postId)}`);

export const updateReview = (id: string, body: UpdateReviewRequest) =>
  request<FoodReview>(`/api/reviews/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const deleteReview = (id: string) =>
  request<{ status: 'ok' }>(`/api/reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const adminDeletePosts = (ids: string) =>
  request<AdminDeletePostsResponse>('/api/admin/delete-posts', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });

export const adminResetRatings = (username: string) =>
  request<AdminResetRatingsResponse>('/api/admin/reset-ratings', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
