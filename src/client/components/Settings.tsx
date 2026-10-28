import { navigateTo, showToast } from '@devvit/web/client';
import type { ComponentType, ReactNode } from 'react';
import { saveMode } from '../lib/api';
import { setMode, useTheme, type Mode } from '../lib/theme';
import { riseDelay } from '../lib/motion';
import { TIER_COLORS } from '../lib/tiers';
import { useEffect, useState } from 'react';
import type { TeamResponse } from '../../shared/api';
import { TEAM_USERNAMES } from '../../shared/team';
import { fetchTeam } from '../lib/api';
import { Avatar } from './ui';
import { DripHeader } from './DripHeader';
import { Username } from './Username';
import {
  ArrowRightIcon,
  ListIcon,
  MailIcon,
  MapIcon,
  MoonIcon,
  SunIcon,
  TrophyIcon,
} from './icons';

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

/** A titled group: the title above, the content in a rounded box. */
const Section = ({
  title,
  description,
  boxed = true,
  children,
}: {
  title: string;
  description?: string;
  /** Wrap the content in a rounded box (the default). */
  boxed?: boolean;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-2">
    <h2 className="px-1 text-base font-extrabold text-ink">{title}</h2>
    {boxed ? (
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm backdrop-blur">
        {description && (
          <p className="mb-3 text-xs text-muted">{description}</p>
        )}
        {children}
      </div>
    ) : (
      children
    )}
  </section>
);

const FEATURES: {
  label: string;
  text: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { label: 'My List', text: 'Add your posts to the tier', Icon: ListIcon },
  { label: 'Ratings', text: 'Top spots for every dish', Icon: TrophyIcon },
  { label: 'Map', text: 'Where you have eaten', Icon: MapIcon },
];

/** What the app is, set openly under the header (no box). */
const About = () => (
  <div className="flex flex-col items-center gap-5 px-2 text-center">
    <p className="max-w-xs text-[15px] leading-relaxed text-ink/85">
      Rate the places you eat at and build your own{' '}
      <span className="font-extrabold text-cta">tier list</span> for every dish.
      Search any Redditor to see their posts and favourites.
    </p>
    <ul className="grid w-full grid-cols-3 gap-2">
      {FEATURES.map(({ label, text, Icon }, i) => (
        <li
          key={label}
          className="rise flex flex-col items-center gap-1.5"
          style={riseDelay(i)}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cta/15 text-cta">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-extrabold text-ink">{label}</span>
          <span className="text-[11px] leading-snug text-muted">{text}</span>
        </li>
      ))}
    </ul>
  </div>
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
    <ul className="grid grid-cols-2 gap-3">
      {(team ?? placeholderTeam()).members.map((member) => (
        <li
          key={member.username}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-2 pt-3 pb-2 shadow-sm backdrop-blur"
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
      <main className="scroll-area flex flex-1 flex-col pb-6">
        <DripHeader title="SwaadNama" />
        <div className="flex flex-col gap-6 px-4 pt-1">
          <About />

          <Section title="How tiers work">
            <p className="-mt-1 mb-2 text-xs text-muted">
              Based on the average rating, out of 10.
            </p>
            <ul className="divide-y divide-line">
              {TIERS.map(({ tier, range }) => (
                <li
                  key={tier}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="flex items-center gap-3 font-semibold text-ink">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold text-white ${TIER_COLORS[tier]}`}
                    >
                      {tier}
                    </span>
                    {tier} tier
                  </span>
                  <span className="text-muted">{range}</span>
                </li>
              ))}
            </ul>
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
              className="flex w-full items-center gap-3 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cta text-cta-ink">
                <MailIcon className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1 font-bold text-ink">Send feedback</span>
              <ArrowRightIcon className="h-4 w-4 text-muted" />
            </button>
          </Section>
          <Section title="The people behind SwaadNama" boxed={false}>
            <Team />
          </Section>
        </div>
      </main>
    </div>
  );
};
