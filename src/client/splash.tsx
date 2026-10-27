import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProfileResponse } from '../shared/api';
import { FoodBackground } from './components/FoodBackground';
import { FoodLoader } from './components/FoodLoader';
import { CogIcon } from './components/icons';
import { PalettePicker } from './components/PalettePicker';
import { Avatar } from './components/ui';
import { fetchProfile } from './lib/api';
import { ART_URL, FALLBACK_AVATAR_URL, useImageLoaded } from './lib/art';
import { initTheme, syncTheme } from './lib/theme';

export const Splash = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [intro, setIntro] = useState(true);
  const [picking, setPicking] = useState(false);
  const artLoaded = useImageLoaded(ART_URL);
  // Which avatar to show is only known once the profile has loaded.
  const avatarLoaded = useImageLoaded(
    profile ? (profile.avatarUrl ?? FALLBACK_AVATAR_URL) : null
  );

  useEffect(() => {
    fetchProfile()
      .then((res) => {
        setProfile(res);
        syncTheme(res.theme);
      })
      .catch((err) => {
        console.error('Failed to load profile', err);
        // Carry on with the Snoo and a generic welcome.
        setProfile({ username: null, avatarUrl: null, theme: null });
      });
  }, []);

  // The veggie intro plays in full (3.5s) every visit, and longer if the art
  // or avatar is still loading.
  if (intro) {
    return (
      <FoodLoader
        ready={artLoaded && avatarLoaded}
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
      <main className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8 text-center">
        <Avatar
          url={profile?.avatarUrl ?? null}
          username={profile?.username ?? null}
          className="h-36"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-ink">
            {profile?.username
              ? `Hey u/${profile.username}!`
              : 'Welcome to SwaadNama'}
          </h1>
          <p className="max-w-sm text-base font-medium text-ink/85">
            Rate the spots you eat at, build your own tier list for every dish,
            and peek at other foodies' favourites.
          </p>
        </div>
        <button
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          className="w-full max-w-xs rounded-full bg-cta px-6 py-3 text-lg font-bold text-cta-ink shadow-lg cursor-pointer hover:brightness-95 transition"
        >
          Explore
        </button>
      </main>
      {picking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Theme"
          onClick={() => setPicking(false)}
          className="modal-backdrop fixed inset-0 z-20 flex items-end justify-center bg-black/55 sm:items-center sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-panel flex max-h-full w-full max-w-md flex-col rounded-t-3xl border border-line bg-surface shadow-2xl backdrop-blur-xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-lg font-extrabold text-ink">Theme</h2>
              <button
                onClick={() => setPicking(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-soft-ink cursor-pointer hover:brightness-95"
              >
                ✕
              </button>
            </div>
            <div className="scroll-area px-4 pb-5">
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
