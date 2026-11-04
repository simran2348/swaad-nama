import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Fan } from '../../shared/api';
import { fetchFans } from '../lib/api';
import { timeAgo } from '../lib/format';
import { riseDelay } from '../lib/motion';
import { CloseIcon, HeartIcon } from './icons';
import { RaterAvatar } from './RaterAvatar';
import { EmptyState, LoadingState } from './ui';

type Result = { ok: true; fans: Fan[] } | { ok: false; error: string };

/**
 * Popup over a dark backdrop: everyone who added you to their favourites,
 * newest first. Opening it marks them as seen (on the server).
 */
export const FansPopup = ({ onClose }: { onClose: () => void }) => {
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    let cancelled = false;
    fetchFans()
      .then((res) => !cancelled && setResult({ ok: true, fans: res.fans }))
      .catch((err: Error) => {
        if (!cancelled) setResult({ ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fans"
      onClick={onClose}
      className="modal-backdrop fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel flex max-h-[min(32rem,100%)] min-h-0 w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-line bg-popover shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <HeartIcon className="h-5 w-5 fill-current text-red-500" />
            Fans
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-soft-ink cursor-pointer hover:brightness-95"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-area min-h-0 flex-1 px-2 pb-3">
          {!result ? (
            <LoadingState />
          ) : !result.ok ? (
            <EmptyState>Couldn't load your fans: {result.error}</EmptyState>
          ) : result.fans.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              No one has added you to their favourites yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {result.fans.map((fan, i) => (
                <li
                  key={fan.username}
                  className="rise flex items-center gap-3 rounded-2xl px-2 py-2"
                  style={riseDelay(i)}
                >
                  <RaterAvatar url={fan.avatarUrl} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                    {fan.username}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {timeAgo(fan.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
