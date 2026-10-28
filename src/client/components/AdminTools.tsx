import { showToast } from '@devvit/web/client';
import { useState, type ComponentType, type ReactNode } from 'react';
import type { AdminDeletePostsResponse } from '../../shared/api';
import { adminDeletePosts, adminResetRatings } from '../lib/api';
import { Spinner } from './ui';
import { DripHeader } from './DripHeader';
import { AdminStats } from './AdminStats';
import { CheckCircleIcon, ShieldIcon, XCircleIcon } from './icons';

const inputClass =
  'w-full rounded-xl border border-line bg-field px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-rose-500';

const STATUS: Record<
  string,
  { label: string; Icon: ComponentType<{ className?: string }>; color: string }
> = {
  deleted: {
    label: 'Deleted',
    Icon: CheckCircleIcon,
    color: 'text-emerald-600',
  },
  removed: { label: 'Mod-removed', Icon: ShieldIcon, color: 'text-sky-600' },
  failed: { label: 'Failed', Icon: XCircleIcon, color: 'text-rose-600' },
};

const StatusLabel = ({ status }: { status: string }) => {
  const info = STATUS[status];
  if (!info) return <span className="text-ink">{status}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${info.color}`}
    >
      <info.Icon className="h-3.5 w-3.5" />
      {info.label}
    </span>
  );
};

/** A destructive action: the first tap arms it, the second runs it. */
const DangerButton = ({
  disabled,
  busy,
  onConfirm,
  children,
}: {
  disabled: boolean;
  busy: boolean;
  onConfirm: () => void;
  children: ReactNode;
}) => {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
      className={`flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        armed
          ? 'bg-rose-600 text-white'
          : 'border border-rose-500/60 text-rose-600 dark:text-rose-300'
      }`}
    >
      {busy && <Spinner className="h-4 w-4" />}
      {armed ? 'Tap to confirm' : children}
    </button>
  );
};

/** Admin-only tools (the server rejects everyone else too). */
export const AdminTools = () => {
  const [ids, setIds] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [results, setResults] = useState<AdminDeletePostsResponse['results']>();
  const [username, setUsername] = useState('');
  const [resetting, setResetting] = useState(false);

  const deletePosts = async () => {
    setDeleting(true);
    try {
      const res = await adminDeletePosts(ids);
      setResults(res.results);
      if (res.results.every((r) => r.status !== 'failed')) setIds('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const resetRatings = async () => {
    setResetting(true);
    try {
      const res = await adminResetRatings(
        username.trim().replace(/^\/?u\//i, '')
      );
      showToast(
        `Removed ${res.removed} ${res.removed === 1 ? 'rating' : 'ratings'} for u/${res.username}`
      );
      setUsername('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="admin-post-ids"
          className="px-1 text-base font-extrabold text-ink"
        >
          Delete posts
        </label>
        <p className="px-1 text-xs leading-relaxed text-muted">
          Comma-separated ids or links. Only a post's author can delete it, so
          users' posts are mod-removed instead: they leave the subreddit and
          SwaadNama, and their ratings are removed too.
        </p>
        <textarea
          id="admin-post-ids"
          className={`${inputClass} min-h-24`}
          value={ids}
          placeholder="abc123, t3_def456, https://www.reddit.com/r/…/comments/…"
          onChange={(e) => setIds(e.target.value)}
        />
        <DangerButton
          disabled={!ids.trim()}
          busy={deleting}
          onConfirm={() => void deletePosts()}
        >
          Delete posts
        </DangerButton>
        {results && results.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1.5 px-1 text-xs">
            {results.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-2">
                <span className="font-mono font-semibold text-ink">{r.id}</span>
                <StatusLabel status={r.status} />
                {r.message && <span className="text-muted">{r.message}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="admin-reset-user"
          className="px-1 text-base font-extrabold text-ink"
        >
          Reset a user's ratings
        </label>
        <p className="px-1 text-xs leading-relaxed text-muted">
          Removes every rating they have. Their Reddit posts aren't touched.
        </p>
        <input
          id="admin-reset-user"
          className={inputClass}
          value={username}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="username"
          onChange={(e) => setUsername(e.target.value)}
        />
        <DangerButton
          disabled={!username.trim()}
          busy={resetting}
          onConfirm={() => void resetRatings()}
        >
          Reset ratings
        </DangerButton>
      </div>
    </div>
  );
};

/** Admin tab: only shown to the admin account (checked on the server too). */
export const AdminScreen = () => (
  <div className="flex h-full min-h-0 flex-1 flex-col">
    <main className="scroll-area flex flex-1 flex-col pb-8">
      <DripHeader title="ADMIN" />
      <div className="flex flex-col gap-8 px-4">
        <p className="text-center text-sm text-muted">Only visible to you.</p>
        <AdminStats />
        <div className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="px-1 text-lg font-extrabold text-ink">Tools</h2>
          <p className="-mt-2 px-1 text-xs text-muted">
            These actions can't be undone.
          </p>
          <AdminTools />
        </div>
      </div>
    </main>
  </div>
);
