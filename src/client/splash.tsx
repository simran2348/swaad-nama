import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProfileResponse } from '../shared/api';
import { FoodBackground } from './components/FoodBackground';
import { FoodLoader } from './components/FoodLoader';
import { CloseIcon, CogIcon } from './components/icons';
import { PalettePicker } from './components/PalettePicker';
import { Avatar } from './components/ui';
import { BrandLogo, BrandTagline } from './components/Brand';
import { fetchProfile } from './lib/api';
import {
  ART_URL,
  FALLBACK_AVATAR_URL,
  FOOD_PATTERN_URL,
  useFontLoaded,
  useImageLoaded,
} from './lib/art';
import { initTheme, syncTheme } from './lib/theme';

/**
 * A long teardrop from a sharp tip at (x1, y1) to a round end at (x2, y2),
 * `width` wide at the round end.
 */
const Teardrop = ({
  x1,
  y1,
  x2,
  y2,
  width,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const r = width / 2;
  return (
    <path
      transform={`translate(${x1} ${y1}) rotate(${angle})`}
      d={`M0 0 Q${(length - r) * 0.5} ${-r * 0.35} ${length - r} ${-r} A${r} ${r} 0 0 1 ${length - r} ${r} Q${(length - r) * 0.5} ${r * 0.35} 0 0Z`}
    />
  );
};

/** Little "excited" strokes on either side of the avatar's head. */
const AvatarRays = () => (
  <svg
    aria-hidden
    viewBox="0 0 200 60"
    fill="currentColor"
    className="pointer-events-none absolute inset-x-0 top-[22%] w-full text-cta"
  >
    <Teardrop x1={42} y1={26} x2={27} y2={10} width={8} />
    <Teardrop x1={38} y1={40} x2={18} y2={37} width={8} />
    <Teardrop x1={158} y1={26} x2={173} y2={10} width={8} />
    <Teardrop x1={162} y1={40} x2={182} y2={37} width={8} />
  </svg>
);

export const Splash = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [intro, setIntro] = useState(true);
  const [picking, setPicking] = useState(false);
  const artLoaded = useImageLoaded(ART_URL);
  const fontLoaded = useFontLoaded();
  // Which avatar to show is only known once the profile has loaded.
  const avatarLoaded = useImageLoaded(
    profile ? (profile.avatarUrl ?? FALLBACK_AVATAR_URL) : null
  );

  const comingSoon = profile?.canUse === false;

  // Once the splash is up, quietly fetch the expanded app's background so
  // it's ready when Explore opens it (not waited on: the feed stays fast).
  useEffect(() => {
    if (intro) return;
    const img = new Image();
    img.src = FOOD_PATTERN_URL;
  }, [intro]);

  useEffect(() => {
    fetchProfile()
      .then((res) => {
        setProfile(res);
        syncTheme(res.theme);
      })
      .catch((err) => {
        console.error('Failed to load profile', err);
        // Carry on with the Snoo and a generic welcome.
        // If the status can't be checked, let them in: the app checks again.
        setProfile({
          username: null,
          avatarUrl: null,
          theme: null,
          canUse: true,
        });
      });
  }, []);

  // The veggie intro plays in full (3.5s) every visit, and longer if the art
  // or avatar is still loading.
  if (intro) {
    return (
      <FoodLoader
        ready={artLoaded && fontLoaded && avatarLoaded}
        onDone={() => setIntro(false)}
      />
    );
  }

  return (
    <>
      <FoodBackground withArt />
      <button
        onClick={() => setPicking(true)}
        aria-label="Change theme"
        title="Theme"
        className="glass absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-ink cursor-pointer transition hover:scale-105"
      >
        <CogIcon className="h-5 w-5" />
      </button>
      <main className="flex h-full flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-5 text-center">
        <div className="flex flex-col items-center">
          <h1>
            <BrandLogo className="h-auto w-56" />
          </h1>
          <BrandTagline className="mt-1" />
        </div>
        <div className="relative px-7">
          {/* Soft glow that stands out from the theme's background. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--glow)_0%,var(--glow)_25%,transparent_70%)] opacity-70 blur-md"
          />
          <AvatarRays />
          <Avatar
            url={profile?.avatarUrl ?? null}
            username={profile?.username ?? null}
            className="relative h-24"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-extrabold text-ink">
            {profile?.username
              ? `Hey u/${profile.username}!`
              : 'Welcome, foodie!'}
          </h2>
          <p className="max-w-sm text-[15px] leading-snug font-semibold text-ink/85">
            Rate the spots you eat at, build your own tier list for every dish,
            and peek at other foodies' favourites.
          </p>
        </div>
        {/* "App status" set to Closed: members see Coming Soon. */}
        <button
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          disabled={comingSoon}
          className="w-full max-w-[15rem] rounded-full bg-cta px-6 py-2.5 text-base font-bold text-cta-ink shadow-lg cursor-pointer hover:brightness-95 transition disabled:cursor-default disabled:opacity-70 disabled:shadow-none disabled:hover:brightness-100"
        >
          {comingSoon ? 'Coming Soon' : 'Explore'}
        </button>
      </main>
      {picking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Theme"
          onClick={() => setPicking(false)}
          className="modal-backdrop fixed inset-0 z-20 flex items-center justify-center bg-black/55 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-panel flex max-h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-popover shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-lg font-extrabold text-ink">Theme</h2>
              <button
                onClick={() => setPicking(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-soft-ink cursor-pointer hover:brightness-95"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="scroll-area min-h-0 flex-1 px-4 pt-1 pb-5">
              <PalettePicker />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
