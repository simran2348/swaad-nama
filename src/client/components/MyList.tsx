import { useState } from 'react';
import type { InitResponse } from '../../shared/api';
import { PostPicker } from './PostPicker';
import { TrendingRow } from './TrendingRow';
import { EmptyState } from './ui';
import { UserSearch } from './UserSearch';
import { ListIcon } from './icons';
import { USER_SEARCH_ENABLED } from '../lib/features';

/**
 * Tab 1: your posts in this subreddit (tap + to add them to the tier list),
 * or another user's posts when you search for them.
 */
export const MyList = ({
  data,
  error,
  onAdded,
}: {
  data: InitResponse | null;
  error: string | null;
  onAdded: () => void;
}) => {
  const [user, setUser] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        {/* Same for everyone, so hidden while viewing someone's posts. */}
        {!user && <TrendingRow />}
        {USER_SEARCH_ENABLED && (
          <UserSearch
            user={user}
            onSearch={setUser}
            onClear={() => setUser(null)}
            placeholder="See someone else's posts"
          />
        )}
        <h2 className="flex items-center gap-1.5 px-1 pt-1 text-sm font-extrabold text-ink">
          <ListIcon className="h-4 w-4 text-cta" />
          {user ? `u/${user}'s posts` : 'Your Posts'}
        </h2>
        {error && <EmptyState>Couldn't load everything: {error}</EmptyState>}
        {/* Loads posts straight away, alongside the app data (not after it). */}
        <PostPicker
          // Fresh list (and selection) per user.
          key={user ?? ''}
          foods={data?.foods ?? []}
          onAdded={onAdded}
          {...(user ? { username: user } : {})}
        />
      </main>
    </div>
  );
};
