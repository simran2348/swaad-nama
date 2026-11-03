import { useState } from 'react';
import type { InitResponse } from '../../shared/api';
import { SectionHeading } from './Brand';
import { PostPicker } from './PostPicker';
import { TrendingRow } from './TrendingRow';
import { EmptyState } from './ui';

/**
 * Tab 1: trending posts, then your posts in this subreddit (select them to
 * add them to the tier list).
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
  const [trendingCount, setTrendingCount] = useState<number | null>();
  const [postsEmpty, setPostsEmpty] = useState(false);
  // Nothing trending and no posts of yours: just the mascot, no heading.
  const showHeading = !postsEmpty || (trendingCount ?? 0) > 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        <TrendingRow onLoaded={setTrendingCount} />
        {showHeading && (
          <div className="pt-1">
            <SectionHeading>Your Posts</SectionHeading>
          </div>
        )}
        {error && <EmptyState>Couldn't load everything: {error}</EmptyState>}
        {/* Loads posts straight away, alongside the app data (not after it). */}
        <PostPicker
          foods={data?.foods ?? []}
          onAdded={onAdded}
          onEmptyChange={setPostsEmpty}
        />
      </main>
    </div>
  );
};
