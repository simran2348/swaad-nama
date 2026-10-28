import { navigateTo, showToast } from '@devvit/web/client';
import type { ComponentType, ReactNode } from 'react';
import { saveMode } from '../lib/api';
import { setMode, useTheme, type Mode } from '../lib/theme';
import { TIER_COLORS } from '../lib/tiers';
import { useEffect, useState } from 'react';
import type { TeamResponse } from '../../shared/api';
import { TEAM_USERNAMES } from '../../shared/team';
import { fetchTeam } from '../lib/api';
import { Avatar, ScreenHeader } from './ui';
import { Username } from './Username';
import { MailIcon, MoonIcon, SunIcon } from './icons';

const FEEDBACK_SUBJECT = 'SwaadNama - User Feedback';

const TIERS: { tier: string; range: string }[] = [
  { tier: 'S', range: '9 and up' },
  { tier: 'A', range: '8 – 8.9' },
  { tier: 'B', range: '6 – 7.9' },
  { tier: 'C', range: '4 – 5.9' },
  { tier: 'D', range: 'below 4' },
];

const MODES: {
  id: Mode;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'light', label: 'Light', Icon: SunIcon },
  { id: 'dark', label: 'Dark', Icon: MoonIcon },
];

const chooseMode = (mode: Mode) => {
  setMode(mode);
  // Saved to the user's account so it follows them to other devices.
  saveMode({ mode }).catch((err: unknown) => {
    console.error('Failed to save appearance', err);
    showToast("Couldn't save your appearance. It'll reset on other devices.");
  });
};

const modmailUrl = (subredditName: string) =>
  `https://www.reddit.com/message/compose?to=${encodeURIComponent(
    `r/${subredditName}`
  )}&subject=${encodeURIComponent(FEEDBACK_SUBJECT)}`;

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm backdrop-blur">
    <h2 className="font-bold text-ink">{title}</h2>
    {description && <p className="mb-3 text-xs text-muted">{description}</p>}
    {children}
  </section>
);

/** Loaded once per app session. */
let teamCache: TeamResponse | null = null;

const placeholderTeam = (): TeamResponse => ({
  members: TEAM_USERNAMES.map((username) => ({ username, avatarUrl: null })),
});

/** The team's Reddit avatars; tap one to open their profile. */
const Team = () => {
  const [team, setTeam] = useState(teamCache);

  useEffect(() => {
    if (teamCache) return;
    let cancelled = false;
    fetchTeam()
      .then((res) => {
        teamCache = res;
        if (!cancelled) setTeam(res);
      })
      .catch((err: unknown) => {
        console.error('Team failed', err);
        // Still show the names, with the default Snoo.
        if (!cancelled) setTeam(placeholderTeam());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ul className="mt-2 grid grid-cols-2 gap-3">
      {(team ?? placeholderTeam()).members.map((member) => (
        <li
          key={member.username}
          className="flex flex-col items-center gap-1.5 rounded-xl bg-soft px-2 pt-3 pb-2"
        >
          <button
            onClick={() =>
              navigateTo(`https://www.reddit.com/user/${member.username}`)
            }
            aria-label={`Open u/${member.username}'s profile`}
            className="flex h-28 items-end justify-center cursor-pointer transition hover:-translate-y-0.5"
          >
            {team ? (
              <Avatar
                url={member.avatarUrl}
                username={member.username}
                className="h-28"
              />
            ) : (
              <span className="h-24 w-20 animate-pulse rounded-full bg-line" />
            )}
          </button>
          <span className="text-xs font-bold text-soft-ink">
            <Username name={member.username} />
          </span>
        </li>
      ))}
    </ul>
  );
};

export const Settings = ({ subredditName }: { subredditName: string }) => {
  const mode: Mode = useTheme().dark ? 'dark' : 'light';

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ScreenHeader title="Settings" />
      <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-3 pb-6">
        <Section title="About SwaadNama">
          <div className="flex flex-col gap-3 text-sm text-ink/85">
            <p>
              Rate the places you eat at and build your own tier list for every
              dish. Search any Redditor to see their posts and favourites.
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-cta">
              <li>
                <b>My List</b>: tick your posts to add them to the tier list, or
                search a Redditor to see their list.
              </li>
              <li>
                <b>Ratings</b>: your top spots in every food category, or a
                Redditor's when you search for them.
              </li>
              <li>
                <b>Map</b>: the places you've rated that have a location.
              </li>
            </ul>
            <div>
              <p className="mb-1.5 text-xs font-bold text-muted">
                How tiers work (average rating out of 10)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {TIERS.map(({ tier, range }) => (
                  <span key={tier} className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold text-white ${TIER_COLORS[tier]}`}
                    >
                      {tier}
                    </span>
                    {range}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Appearance"
          description="Colour themes live on the SwaadNama post: tap its cog."
        >
          <div
            role="radiogroup"
            aria-label="Appearance"
            className="flex rounded-full border border-line bg-soft p-1"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => mode !== m.id && chooseMode(m.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold cursor-pointer transition-colors ${
                  mode === m.id
                    ? 'bg-cta text-cta-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <m.Icon className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Feedback"
          description={
            subredditName
              ? `Ideas or issues? Message the r/${subredditName} mods.`
              : 'Ideas or issues? Message the subreddit mods.'
          }
        >
          <button
            onClick={() => navigateTo(modmailUrl(subredditName))}
            disabled={!subredditName}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-cta px-4 py-2.5 font-bold text-cta-ink shadow-sm cursor-pointer hover:brightness-95 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MailIcon className="h-4.5 w-4.5" />
            Send feedback
          </button>
        </Section>
        <Section title="The people behind SwaadNama">
          <Team />
        </Section>
      </main>
    </div>
  );
};
