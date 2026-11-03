import './index.css';

import {
  StrictMode,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse } from '../shared/api';
import { FoodBackground } from './components/FoodBackground';
import {
  BookIcon,
  CogIcon,
  ListIcon,
  MapIcon,
  TrophyIcon,
  WrenchIcon,
} from './components/icons';
import { AdminScreen } from './components/AdminTools';
import { isAdmin } from '../shared/admin';
import { Journal } from './components/Journal';
import { MapView } from './components/MapView';
import { MyList } from './components/MyList';
import { Ratings } from './components/Ratings';
import { Settings } from './components/Settings';
import { fetchInit } from './lib/api';
import { DripHeader } from './components/DripHeader';
import { trackAppReady } from './lib/track';
import { NAV_HEIGHT, NavSlotContext } from './lib/navSlot';
import { initAppTheme, syncMode } from './lib/theme';

type Tab = 'list' | 'ratings' | 'journal' | 'map' | 'settings' | 'admin';

type TabInfo = { id: Tab; label: string; icon: ReactNode };

const TABS: TabInfo[] = [
  { id: 'list', label: 'My List', icon: <ListIcon className="h-6 w-6" /> },
  { id: 'ratings', label: 'Ratings', icon: <TrophyIcon className="h-6 w-6" /> },
  { id: 'map', label: 'Map', icon: <MapIcon className="h-6 w-6" /> },
  { id: 'journal', label: 'Journal', icon: <BookIcon className="h-6 w-6" /> },
  { id: 'settings', label: 'Settings', icon: <CogIcon className="h-6 w-6" /> },
];

/** Only for the admin account (the server checks too). */
const ADMIN_TAB: TabInfo = {
  id: 'admin',
  label: 'Admin',
  icon: <WrenchIcon className="h-6 w-6" />,
};

const BottomNav = ({
  tab,
  tabs,
  onChange,
}: {
  tab: Tab;
  tabs: TabInfo[];
  onChange: (tab: Tab) => void;
}) => (
  <nav
    // Solid over the map: the usual see-through surface (very faint in
    // dark mode) lets the bright map show through.
    className={`flex rounded-t-3xl border-t border-line pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-10px_rgb(0_0_0/0.25)] backdrop-blur group-has-[[data-nav-slot]>*]/nav:invisible ${
      tab === 'map' ? 'bg-popover/95' : 'bg-surface'
    }`}
  >
    {tabs.map((t) => {
      const active = t.id === tab;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          title={t.label}
          aria-current={active ? 'page' : undefined}
          className={`flex ${NAV_HEIGHT} flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
            active ? 'text-cta' : 'text-muted hover:text-ink'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      );
    })}
  </nav>
);

export const App = () => {
  const [tab, setTab] = useState<Tab>('list');
  // Bumped when Ratings is tapped again, to go back to its main screen.
  const [ratingsReset, setRatingsReset] = useState(0);
  const [data, setData] = useState<InitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modeSynced = useRef(false);
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);

  const load = useCallback(() => {
    fetchInit()
      .then((res) => {
        setData(res);
        setError(null);
        // Adopt the account's saved appearance once; later refreshes could
        // race with a choice the user is making right now.
        if (!modeSynced.current) {
          modeSynced.current = true;
          syncMode(res.mode);
          trackAppReady();
        }
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  // "App status" set to Closed by a mod (the admin can still get in).
  if (data?.canUse === false) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <DripHeader title="SwaadNama" />
        <main className="flex flex-1 flex-col items-center gap-2 px-6 pt-6 text-center">
          <h2 className="text-2xl font-extrabold text-ink">Coming Soon</h2>
          <p className="max-w-xs text-sm text-muted">
            SwaadNama isn't open in r/{data.subredditName} yet. Check back soon!
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <NavSlotContext value={navSlot}>
        {/* The map runs under the nav (the nav floats over it); other
            screens stop above it. */}
        <div
          className={
            tab === 'map'
              ? 'absolute inset-0 flex flex-col'
              : 'flex min-h-0 flex-1 flex-col'
          }
        >
          {tab === 'list' ? (
            <MyList
              data={data}
              error={error}
              onAdded={() => {
                load();
                // Show the new entries under their food categories.
                setTab('ratings');
              }}
            />
          ) : tab === 'ratings' ? (
            <Ratings
              key={ratingsReset}
              foods={data?.foods ?? []}
              username={data?.username ?? null}
            />
          ) : tab === 'journal' ? (
            <Journal />
          ) : tab === 'map' ? (
            <MapView data={data} />
          ) : tab === 'admin' && isAdmin(data?.username) ? (
            <AdminScreen subredditName={data?.subredditName ?? ''} />
          ) : (
            <Settings subredditName={data?.subredditName ?? ''} />
          )}
        </div>
      </NavSlotContext>
      {/* The slot overlays the nav; the nav hides while a bar is in it. */}
      <div
        className={`group/nav relative z-10 ${tab === 'map' ? 'mt-auto' : ''}`}
      >
        <div
          ref={setNavSlot}
          data-nav-slot
          className="pointer-events-none absolute inset-0 z-10"
        />
        <BottomNav
          tab={tab}
          tabs={isAdmin(data?.username) ? [...TABS, ADMIN_TAB] : TABS}
          onChange={(next) => {
            // Tapping Ratings while on it closes any screen opened inside.
            if (next === 'ratings' && tab === 'ratings') {
              setRatingsReset((n) => n + 1);
            }
            setTab(next);
          }}
        />
      </div>
    </div>
  );
};

initAppTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FoodBackground withPattern />
    {/* Reddit lets users widen the expanded view (desktop / fullscreen);
        keep the app a phone-like column and let the background fill the rest. */}
    <div className="mx-auto h-full w-full max-w-[768px] border-line min-[769px]:border-x min-[769px]:shadow-xl">
      <App />
    </div>
  </StrictMode>
);
