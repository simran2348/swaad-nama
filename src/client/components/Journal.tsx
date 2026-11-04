import { useEffect, useState, type ComponentType } from 'react';
import type {
  JournalEntry,
  JournalKind,
  JournalResponse,
} from '../../shared/api';
import { fetchJournal, fetchJournalEntries } from '../lib/api';
import {
  EMPTY_JOURNAL_IMAGE,
  preloadImages,
  TRAIL_HOME_IMAGE,
} from '../lib/art';
import { EmptyMascot } from './EmptyMascot';
import { FansPopup } from './FansPopup';
import { HomeIcon, PinIcon, PlateIcon } from './icons';
import { JournalEntryPopup, JournalGrid } from './JournalEntries';
import { TravelTrail } from './TravelTrail';
import { Avatar, EmptyState, LoadingState } from './ui';

/** The diary's three sections, shown as icon tabs under the profile. */
const SECTIONS = [
  {
    id: 'travel',
    label: 'Travel',
    // Food tried on trips and holidays.
    icon: PinIcon,
    empty: 'No food trips yet!',
  },
  {
    id: 'home',
    label: 'Home-made',
    icon: HomeIcon,
    empty: 'No home-made food yet!',
  },
  {
    id: 'recipe',
    label: 'Recipes',
    icon: PlateIcon,
    empty: 'No recipes yet!',
  },
] as const satisfies readonly {
  id: JournalKind;
  label: string;
  icon: ComponentType<{ className?: string }>;
  empty: string;
}[];

/** Last results, shown straight away while fresh ones load. */
let journalCache: JournalResponse | null = null;
let entriesCache: JournalEntry[] | null = null;

const StatValue = ({ value }: { value: number | null }) =>
  value === null ? (
    <span className="h-6 w-8 animate-pulse rounded bg-soft" />
  ) : (
    <span className="text-xl leading-tight font-extrabold text-ink">
      {value}
    </span>
  );

const StatLabel = ({ label }: { label: string }) => (
  <span className="truncate text-xs font-semibold text-muted">{label}</span>
);

/** One count in the profile row, e.g. "24 / Ratings". */
const Stat = ({ value, label }: { value: number | null; label: string }) => (
  <div className="flex min-w-0 flex-col items-start">
    <StatValue value={value} />
    <StatLabel label={label} />
  </div>
);

/** The Fans count: opens the list, with a red dot when someone new added you. */
const FansStat = ({
  value,
  hasNew,
  onOpen,
}: {
  value: number | null;
  hasNew: boolean;
  onOpen: () => void;
}) => (
  <button
    type="button"
    onClick={onOpen}
    disabled={value === null}
    aria-label={`${value ?? 0} fans${hasNew ? ', someone new' : ''}. See who added you`}
    className="flex min-w-0 flex-col items-start text-left cursor-pointer transition hover:opacity-80 disabled:cursor-default"
  >
    <span className="relative">
      <StatValue value={value} />
      {hasNew && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-surface"
        />
      )}
    </span>
    <StatLabel label="Fans" />
  </button>
);

/**
 * Tab: your food diary. The top is a profile like Instagram's: your full
 * Snoo on the left, your username and three counts on the right. Below,
 * three sections as tabs: Travel (food from trips, as a trail), Home-made
 * and Recipes. Posts are added to them from My List.
 */
export const Journal = ({
  initialSection = 'travel',
}: {
  initialSection?: JournalKind;
}) => {
  const [data, setData] = useState(journalCache);
  const [entries, setEntries] = useState(entriesCache);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [opened, setOpened] = useState<JournalEntry | null>(null);
  const [showFans, setShowFans] = useState(false);
  const [sectionId, setSectionId] = useState<JournalKind>(initialSection);
  const section = SECTIONS.find((item) => item.id === sectionId) ?? SECTIONS[0];
  // Bumped when the fans list closes, to refresh the counts.
  const [version, setVersion] = useState(0);

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
  }, [version]);

  useEffect(() => {
    let cancelled = false;
    // The loader stays until the entries and their pictures have loaded.
    fetchJournalEntries()
      .then(async (res) => {
        await preloadImages([
          TRAIL_HOME_IMAGE.src,
          EMPTY_JOURNAL_IMAGE.src,
          ...res.entries.flatMap((entry) =>
            entry.photos[0]?.image ? [entry.photos[0].image] : []
          ),
        ]);
        entriesCache = res.entries;
        if (!cancelled) setEntries(res.entries);
      })
      .catch((err: Error) => !cancelled && setEntriesError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = entries?.filter((entry) => entry.kind === sectionId) ?? [];

  const openFans = () => {
    // Opening the list counts as seeing everyone in it: the dot goes.
    if (data) {
      journalCache = { ...data, newFans: false };
      setData(journalCache);
    }
    setShowFans(true);
  };

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
              <FansStat
                value={data?.fans ?? null}
                hasNew={data?.newFans ?? false}
                onOpen={openFans}
              />
            </div>
          </div>
        </section>
        {/* Sections as icon tabs, like a profile's grid tabs. */}
        <div
          role="tablist"
          aria-label="Journal sections"
          className="mx-auto grid w-full max-w-md grid-cols-3 border-b border-line"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = id === sectionId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="journal-section"
                onClick={() => setSectionId(id)}
                className={`-mb-px flex flex-col items-center gap-1 border-b-2 pt-1 pb-2 text-xs font-bold cursor-pointer transition-colors ${
                  active
                    ? 'border-cta text-cta'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </button>
            );
          })}
        </div>
        <div
          id="journal-section"
          role="tabpanel"
          className="flex flex-1 flex-col"
        >
          {!entries ? (
            entriesError ? (
              <EmptyState>
                Couldn't load your journal: {entriesError}
              </EmptyState>
            ) : (
              <LoadingState />
            )
          ) : shown.length === 0 ? (
            <EmptyMascot
              key={section.id}
              {...EMPTY_JOURNAL_IMAGE}
              alt="A sad carrot reading an empty diary"
              title={section.empty}
            >
              Tap the book on one of your posts in My List to add it here.
            </EmptyMascot>
          ) : section.id === 'travel' ? (
            <TravelTrail
              trips={shown.map((entry) => ({
                id: entry.id,
                place: entry.place,
                dishes: entry.photos.length,
                photo: entry.photos[0]?.image || null,
              }))}
              onOpen={(id) =>
                setOpened(shown.find((entry) => entry.id === id) ?? null)
              }
            />
          ) : (
            <JournalGrid key={section.id} entries={shown} onOpen={setOpened} />
          )}
        </div>
      </main>
      {opened && (
        <JournalEntryPopup entry={opened} onClose={() => setOpened(null)} />
      )}
      {showFans && (
        <FansPopup
          onClose={() => {
            setShowFans(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};
