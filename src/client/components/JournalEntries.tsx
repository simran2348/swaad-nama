import { navigateTo } from '@devvit/web/client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { JournalEntry } from '../../shared/api';
import { entryTitle } from '../../shared/journal';
import { formatDate } from '../lib/format';
import { riseDelay } from '../lib/motion';
import { Carousel } from './Carousel';
import {
  CloseIcon,
  ExternalLinkIcon,
  FlagIcon,
  PinIcon,
  PlateIcon,
} from './icons';

/** Your notes, two lines at first; "See more" shows the rest. */
const MoreText = ({ text }: { text: string }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);

  // Only offer "See more" when the text is cut short.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);

  return (
    <div className="flex flex-col items-start gap-1 border-t border-line pt-3">
      <h3 className="text-sm font-extrabold text-ink">Notes</h3>
      <p
        ref={ref}
        className={`text-sm whitespace-pre-line text-muted ${open ? '' : 'line-clamp-2'}`}
      >
        {text}
      </p>
      {(long || open) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-sm font-bold text-cta cursor-pointer hover:underline"
        >
          {open ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
};

/**
 * Home-made food or recipes as a grid of photo cards with the dish name.
 * Tap one to see it in full.
 */
export const JournalGrid = ({
  entries,
  onOpen,
}: {
  entries: readonly JournalEntry[];
  onOpen: (entry: JournalEntry) => void;
}) => (
  <ul className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3">
    {entries.map((entry, i) => {
      const image = entry.photos[0]?.image;
      return (
        <li key={entry.id} className="rise h-48" style={riseDelay(i)}>
          <button
            type="button"
            onClick={() => onOpen(entry)}
            aria-label={`See ${entryTitle(entry)}`}
            className="relative isolate block h-full w-full transform-gpu overflow-hidden rounded-2xl bg-cta-tint text-left shadow-md cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {image ? (
              <img
                src={image}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center pb-8 text-cta">
                <PlateIcon className="h-10 w-10" />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 line-clamp-2 p-2.5 text-sm leading-tight font-extrabold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
              {entryTitle(entry)}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

/**
 * Popup over a dark backdrop with one journal entry: its photos in a
 * carousel (swipe left and right; the dish name below follows the photo),
 * the recipe and, last, your notes cut short with "See more".
 */
export const JournalEntryPopup = ({
  entry,
  own,
  onClose,
}: {
  entry: JournalEntry;
  /** Your own entry (otherwise someone else's, which you can report). */
  own: boolean;
  onClose: () => void;
}) => {
  // Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trip = entry.kind === 'travel';
  const [index, setIndex] = useState(0);
  const photo = entry.photos[index] ?? entry.photos[0];
  // Photos that have an image (a post without photos has none).
  const images = entry.photos.flatMap((p) => (p.image ? [p.image] : []));

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={entryTitle(entry)}
      onClick={onClose}
      className="modal-backdrop fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel flex max-h-[min(40rem,100%)] min-h-0 w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-line bg-popover shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 px-4 pt-4 pb-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-lg leading-tight font-extrabold text-ink">
              {trip && <PinIcon className="h-5 w-5 shrink-0 text-cta" />}
              <span className="break-words">{entryTitle(entry)}</span>
            </h2>
            <p className="text-xs text-muted">{formatDate(entry.at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-soft-ink cursor-pointer hover:brightness-95"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-area flex min-h-0 flex-1 flex-col gap-3 px-4 pb-5">
          {images.length > 0 ? (
            <Carousel
              images={images}
              className="h-72 shrink-0 rounded-2xl"
              onIndexChange={setIndex}
            />
          ) : (
            <span className="flex h-32 shrink-0 items-center justify-center rounded-2xl bg-cta-tint text-cta">
              <PlateIcon className="h-10 w-10" />
            </span>
          )}
          {/* The dish in the photo in view (a trip has one per photo). */}
          {trip && photo && (
            <div className="flex items-baseline justify-between gap-2">
              <h3
                key={index}
                className="rise min-w-0 font-extrabold break-words text-ink"
              >
                {photo.dish}
              </h3>
              {entry.photos.length > 1 && (
                <span className="shrink-0 text-xs font-semibold text-muted">
                  {index + 1} / {entry.photos.length}
                </span>
              )}
            </div>
          )}
          {photo?.recipe && (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-extrabold text-ink">Recipe</h3>
              <p className="text-sm whitespace-pre-line text-ink">
                {photo.recipe}
              </p>
            </div>
          )}
          {entry.body && <MoreText text={entry.body} />}
          {/* The entry is a Reddit comment from its author: report it there. */}
          {entry.commentUrl && (
            <button
              type="button"
              onClick={() => entry.commentUrl && navigateTo(entry.commentUrl)}
              className="flex items-center gap-1.5 self-start text-xs font-bold text-muted cursor-pointer hover:text-ink"
            >
              {own ? (
                <>
                  <ExternalLinkIcon className="h-3.5 w-3.5" /> See your comment
                  on Reddit
                </>
              ) : (
                <>
                  <FlagIcon className="h-3.5 w-3.5" /> Report
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
