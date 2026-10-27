import { useTookLong } from '../lib/useTookLong';
import { useState, type ReactNode } from 'react';
import { FALLBACK_AVATAR_URL } from '../lib/art';

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="mx-auto my-4 max-w-xs rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm font-medium text-muted backdrop-blur">
    {children}
  </p>
);

/** Small spinning ring; takes the current text colour. */
export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <span
    aria-hidden
    className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
  />
);

/** Centred spinner with a message, for loading sections. */
export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => {
  const tookLong = useTookLong();
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm font-medium text-muted"
    >
      <Spinner className="h-7 w-7 text-cta" />
      {label}
      {tookLong && (
        <span className="max-w-xs text-xs">
          This is taking longer than usual. Hang tight!
        </span>
      )}
    </div>
  );
};

export const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    aria-label="Back"
    className="shrink-0 rounded-full p-1.5 text-lg leading-none text-ink cursor-pointer hover:bg-soft transition-colors"
  >
    ←
  </button>
);

/** Top bar of an app screen. */
export const ScreenHeader = ({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) => (
  <header className="flex items-center gap-2 border-b border-line bg-surface px-4 pt-4 pb-3 backdrop-blur">
    {left}
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-xl font-extrabold text-ink">{title}</h1>
      {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
    </div>
    {right}
  </header>
);

export const Avatar = ({
  url,
  username,
  className = '',
}: {
  url: string | null;
  username: string | null;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={url && !failed ? url : FALLBACK_AVATAR_URL}
      alt={username ? `u/${username}` : 'Snoo'}
      onError={() => setFailed(true)}
      className={`w-auto max-w-full object-contain drop-shadow-lg ${className}`}
    />
  );
};
