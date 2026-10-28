import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { cleanPostBody } from '../../shared/text';
import { useTheme } from '../lib/theme';
import { Carousel } from './Carousel';
import { Waves } from './decor';
import { ThemeSurface } from './FoodBackground';

/** An item in the detail page's ⋯ menu. */
export type MenuAction = {
  label: string;
  /** An icon component from ./icons (sized by the menu). */
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
};

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const roundButton =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur cursor-pointer transition hover:bg-white active:scale-95';

const BackArrow = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="h-4 w-4"
  >
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

const MoreDots = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const Menu = ({ actions }: { actions: MenuAction[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={roundButton}
      >
        <MoreDots />
      </button>
      {open && (
        <>
          {/* Tap anywhere else to close. */}
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <ul
            role="menu"
            className="menu-pop absolute top-11 right-0 z-10 min-w-44 overflow-hidden rounded-2xl border border-line bg-field py-1 shadow-xl"
          >
            {actions.map((action) => (
              <li key={action.label}>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    action.onSelect();
                  }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold cursor-pointer hover:bg-soft ${
                    action.danger
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-ink'
                  }`}
                >
                  <action.icon className="h-4.5 w-4.5 shrink-0" />
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

/**
 * Full-screen detail page that slides in from the left. Photos run edge to
 * edge at the top (dot carousel, rounded bottom), with back and ⋯ buttons
 * floating over them. Back (or Escape) slides it out again.
 */
export const Modal = ({
  label,
  images = [],
  actions = [],
  onBack,
  onClose,
  footer,
  children,
}: {
  /** Accessible name for the page. */
  label: string;
  images?: string[];
  /** ⋯ menu items; the button is hidden when there are none. */
  actions?: MenuAction[];
  /** Overrides the back button, e.g. to leave edit mode instead of closing. */
  onBack?: () => void;
  onClose: () => void;
  /** Pinned below the scrolling content, e.g. Save or confirm buttons. */
  footer?: ReactNode;
  children: ReactNode;
}) => {
  const palette = useTheme();
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (reducedMotion()) onClose();
    else setClosing(true);
  };
  const back = onBack ?? close;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && back();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    // Clipped to the app column so the slide doesn't show beside it.
    <div className="fixed inset-0 z-40 mx-auto max-w-[768px] overflow-hidden">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        // Only this page's own slide-out, not animations bubbling from inside.
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) onClose();
        }}
        className={`relative isolate flex h-full flex-col shadow-2xl ${
          closing ? 'screen-out' : 'screen-in'
        }`}
      >
        <ThemeSurface
          palette={palette}
          withArt={false}
          className="absolute inset-0 -z-10"
        />
        <Waves className="absolute inset-x-0 bottom-0 -z-10 h-32 w-full text-cta" />
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button onClick={back} aria-label="Back" className={roundButton}>
            <BackArrow />
          </button>
          {actions.length > 0 && <Menu actions={actions} />}
        </div>
        <div className="scroll-area flex-1">
          {images.length > 0 ? (
            <Carousel
              images={images}
              className="h-55 rounded-b-3xl shadow-lg sm:h-72"
            />
          ) : (
            <div className="h-14" />
          )}
          {children}
        </div>
        {footer && (
          <div className="border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/** Title, a meta line (date, author), extras, then the body text. */
export const PostContent = ({
  title,
  meta,
  body,
  children,
}: {
  title: string;
  meta?: ReactNode;
  body: string;
  /** Rendered between the meta line and the body (e.g. the rating). */
  children?: ReactNode;
}) => {
  const text = cleanPostBody(body);
  return (
    <article className="flex flex-col gap-3 px-4 pt-4 pb-28">
      <div>
        <h2 className="text-xl font-extrabold leading-snug text-ink">
          {title}
        </h2>
        {meta && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-xs text-muted">
            {meta}
          </p>
        )}
      </div>
      {children}
      {text && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">
          {text}
        </p>
      )}
    </article>
  );
};
