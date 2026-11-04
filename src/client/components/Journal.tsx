import { useEffect, useState } from 'react';
import type { JournalResponse } from '../../shared/api';
import { fetchJournal } from '../lib/api';
import { EMPTY_JOURNAL_IMAGE } from '../lib/art';
import { EmptyMascot } from './EmptyMascot';
import { Avatar } from './ui';

/** Last result, shown straight away while a fresh one loads. */
let journalCache: JournalResponse | null = null;

/** One count in the profile row, e.g. "24 / Ratings". */
const Stat = ({ value, label }: { value: number | null; label: string }) => (
  <div className="flex min-w-0 flex-col items-start">
    {value === null ? (
      <span className="h-6 w-8 animate-pulse rounded bg-soft" />
    ) : (
      <span className="text-xl leading-tight font-extrabold text-ink">
        {value}
      </span>
    )}
    <span className="truncate text-xs font-semibold text-muted">{label}</span>
  </div>
);

/**
 * Tab: your food diary. The top is a profile like Instagram's: your full
 * Snoo on the left, your username and three counts on the right. Diary
 * entries come in a later version.
 */
export const Journal = () => {
  const [data, setData] = useState(journalCache);

  useEffect(() => {
    let cancelled = false;
    fetchJournal()
      .then((res) => {
        journalCache = res;
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => console.error('Journal failed', err));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <main className="scroll-area flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
        <section
          aria-label="Your profile"
          className="mx-auto flex w-full max-w-md items-center gap-4 px-3"
        >
          <Avatar
            url={data?.avatarUrl ?? null}
            username={data?.username ?? null}
            className="h-28 shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h1 className="truncate text-lg font-extrabold text-ink">
              {data ? (data.username ?? 'Guest') : ' '}
            </h1>
            <div className="grid grid-cols-3 gap-2">
              <Stat value={data?.ratings ?? null} label="Ratings" />
              <Stat value={data?.categories ?? null} label="Categories" />
              <Stat value={data?.fans ?? null} label="Fans" />
            </div>
          </div>
        </section>
        {/* No diary entries yet (they come in a later version). */}
        <EmptyMascot
          {...EMPTY_JOURNAL_IMAGE}
          alt="A sad carrot reading an empty diary"
          title="Your diary is empty!"
        />
      </main>
    </div>
  );
};
