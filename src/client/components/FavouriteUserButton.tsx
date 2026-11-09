import { toggleFavouriteUser, useIsFavouriteUser } from '../lib/favourites';
import { HeartIcon } from './icons';

/**
 * Round heart floating at the bottom right of someone's ratings or journal:
 * tap to add them to your favourites (filled red) or take them off (outline).
 * Its parent must be `relative`.
 */
export const FavouriteUserButton = ({ username }: { username: string }) => {
  const favourite = useIsFavouriteUser(username);
  return (
    <button
      type="button"
      onClick={() =>
        toggleFavouriteUser({ username, avatarUrl: null, count: 0 })
      }
      aria-pressed={favourite}
      aria-label={
        favourite
          ? `Remove u/${username} from favourites`
          : `Add u/${username} to favourites`
      }
      title={favourite ? 'In your favourites' : 'Add to favourites'}
      className={`absolute right-4 bottom-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface shadow-lg cursor-pointer transition hover:scale-105 active:scale-95 ${
        favourite ? 'text-red-500' : 'text-muted/60 hover:text-muted'
      }`}
    >
      <HeartIcon className="h-6 w-6 fill-current" />
    </button>
  );
};
