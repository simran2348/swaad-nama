import type { InitResponse } from '../../shared/api';
import { PostPicker } from './PostPicker';
import { TrendingRow } from './TrendingRow';
import { EmptyState } from './ui';
import { ListIcon } from './icons';

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
}) => (
  <div className="flex h-full min-h-0 flex-1 flex-col">
    <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
      <TrendingRow />
      <h2 className="flex items-center gap-1.5 px-1 pt-1 text-sm font-extrabold text-ink">
        <ListIcon className="h-4 w-4 text-cta" />
        Your Posts
      </h2>
      {error && <EmptyState>Couldn't load everything: {error}</EmptyState>}
      {/* Loads posts straight away, alongside the app data (not after it). */}
      <PostPicker foods={data?.foods ?? []} onAdded={onAdded} />
    </main>
  </div>
);
