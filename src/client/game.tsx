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
import { CogIcon, ListIcon, MapIcon, TrophyIcon } from './components/icons';
import { MapView } from './components/MapView';
import { MyList } from './components/MyList';
import { Ratings } from './components/Ratings';
import { Settings } from './components/Settings';
import { fetchInit } from './lib/api';
import { NAV_HEIGHT, NavSlotContext } from './lib/navSlot';
import { initAppTheme, syncMode } from './lib/theme';

type Tab = 'list' | 'ratings' | 'map' | 'settings';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'list', label: 'My List', icon: <ListIcon className="h-6 w-6" /> },
  { id: 'ratings', label: 'Ratings', icon: <TrophyIcon className="h-6 w-6" /> },
  { id: 'map', label: 'Map', icon: <MapIcon className="h-6 w-6" /> },
  { id: 'settings', label: 'Settings', icon: <CogIcon className="h-6 w-6" /> },
];

const BottomNav = ({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
}) => (
  <nav className="flex rounded-t-3xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-10px_rgb(0_0_0/0.25)] backdrop-blur group-has-[[data-nav-slot]>*]/nav:invisible">
    {TABS.map((t) => {
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
        }
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <NavSlotContext value={navSlot}>
        <div className="flex min-h-0 flex-1 flex-col">
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
            <Ratings foods={data?.foods ?? []} />
          ) : tab === 'map' ? (
            <MapView data={data} />
          ) : (
            <Settings
              subredditName={data?.subredditName ?? ''}
              username={data?.username ?? null}
            />
          )}
        </div>
      </NavSlotContext>
      {/* The slot overlays the nav; the nav hides while a bar is in it. */}
      <div className="group/nav relative">
        <div
          ref={setNavSlot}
          data-nav-slot
          className="pointer-events-none absolute inset-0 z-10"
        />
        <BottomNav tab={tab} onChange={setTab} />
      </div>
    </div>
  );
};

initAppTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FoodBackground />
    {/* Reddit lets users widen the expanded view (desktop / fullscreen);
        keep the app a phone-like column and let the background fill the rest. */}
    <div className="mx-auto h-full w-full max-w-[768px] border-line min-[769px]:border-x min-[769px]:shadow-xl">
      <App />
    </div>
  </StrictMode>
);
