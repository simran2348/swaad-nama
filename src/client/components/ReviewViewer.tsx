import { navigateTo, showToast } from '@devvit/web/client';
import { useState } from 'react';
import type { FoodReview } from '../../shared/api';
import { MAX_RATING, formatBudget, tierFor } from '../../shared/food';
import { deleteReview, updateReview } from '../lib/api';
import { draftToUpdate, isDraftComplete } from '../lib/draft';
import { formatDate, redditPostUrl } from '../lib/format';
import { TIER_COLORS, TIER_LABELS, TIER_TEXT } from '../lib/tiers';
import {
  CalendarIcon,
  ExternalLinkIcon,
  PencilIcon,
  PinIcon,
  TrashIcon,
} from './icons';
import { Modal, PostContent, type MenuAction } from './Modal';
import { ReviewFields, type ReviewDraft } from './ReviewFields';
import { Spinner } from './ui';

const toDraft = (review: FoodReview): ReviewDraft => ({
  title: review.title,
  food: review.food,
  place: review.place,
  location: review.location,
  rating: review.rating,
  review: review.review,
  budget: review.budget ?? 0,
  vibes: review.vibes,
});

const secondaryButton =
  'rounded-full border border-line bg-soft px-4 py-2 text-sm font-bold text-soft-ink cursor-pointer hover:brightness-95';

/**
 * Full-screen page for a rating: photos, the (possibly edited) title and
 * text, and the rating. Your own ratings can be edited or deleted from the
 * ⋯ menu.
 */
export const ReviewViewer = ({
  review,
  editable = false,
  foods = [],
  onClose,
  onChanged,
}: {
  review: FoodReview;
  /** The viewer owns this rating. */
  editable?: boolean;
  /** Food category quick picks for editing. */
  foods?: string[];
  onClose: () => void;
  /** After an edit (the new rating) or a delete (null). */
  onChanged?: (review: FoodReview | null) => void;
}) => {
  const [current, setCurrent] = useState(review);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tier = tierFor(current.rating);
  const { postId } = current;

  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const updated = await updateReview(current.id, draftToUpdate(draft));
      setCurrent(updated);
      setDraft(null);
      showToast('Rating updated');
      onChanged?.(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't save changes");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteReview(current.id);
      showToast('Rating deleted');
      onChanged?.(null);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't delete");
      setBusy(false);
    }
  };

  const actions: MenuAction[] = [
    ...(postId
      ? [
          {
            label: 'View on Reddit',
            icon: ExternalLinkIcon,
            onSelect: () => navigateTo(redditPostUrl(postId)),
          },
        ]
      : []),
    ...(editable
      ? [
          {
            label: 'Edit rating',
            icon: PencilIcon,
            onSelect: () => {
              setConfirmDelete(false);
              setDraft(toDraft(current));
            },
          },
          {
            label: 'Delete rating',
            icon: TrashIcon,
            danger: true,
            onSelect: () => setConfirmDelete(true),
          },
        ]
      : []),
  ];

  if (draft) {
    return (
      <Modal
        label="Edit rating"
        onBack={() => setDraft(null)}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            <button onClick={() => setDraft(null)} className={secondaryButton}>
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={!isDraftComplete(draft) || busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cta px-4 py-2 text-sm font-bold text-cta-ink shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Spinner className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        }
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8">
          <h2 className="text-lg font-extrabold text-ink">Edit rating</h2>
          <ReviewFields
            draft={draft}
            foods={foods}
            onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      label={current.title || current.place}
      images={current.images}
      actions={actions}
      onClose={onClose}
      {...(confirmDelete
        ? {
            footer: (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs font-semibold text-ink">
                  Delete this rating? The Reddit post stays.
                </p>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className={secondaryButton}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void remove()}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-rose-700 disabled:opacity-60"
                >
                  {busy && <Spinner className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            ),
          }
        : {})}
    >
      <PostContent
        title={current.title || `${current.food} at ${current.place}`}
        meta={
          <>
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>{formatDate(current.postedAt)}</span>
          </>
        }
        body={current.review}
      >
        {/* Place card: tier, place and address, then the score. */}
        <div className="mt-1 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm backdrop-blur">
          <span
            title={`${tier} tier`}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-extrabold text-white shadow-md ${TIER_COLORS[tier]}`}
          >
            {tier}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-ink">
              {current.place}
            </p>
            <p className="truncate text-xs text-muted">{current.food}</p>
            {current.location?.address && (
              <p className="mt-1 flex items-start gap-1 text-xs text-muted">
                <PinIcon className="mt-px h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{current.location.address}</span>
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="leading-none">
              <span className="text-2xl font-extrabold text-ink">
                {current.rating}
              </span>
              <span className="text-sm font-bold text-muted">
                /{MAX_RATING}
              </span>
            </p>
            <p className={`mt-1 text-xs font-bold ${TIER_TEXT[tier] ?? ''}`}>
              {TIER_LABELS[tier]}
            </p>
          </div>
        </div>
        {(current.budget !== undefined || current.vibes.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {current.budget !== undefined && (
              <span className="rounded-full bg-cta px-3.5 py-1.5 text-sm font-bold text-cta-ink shadow-sm">
                {formatBudget(current.budget)} / person
              </span>
            )}
            {current.vibes.map((vibe) => (
              <span
                key={vibe}
                className="rounded-full border border-line bg-soft px-3.5 py-1.5 text-sm font-semibold text-soft-ink"
              >
                {vibe}
              </span>
            ))}
          </div>
        )}
      </PostContent>
    </Modal>
  );
};
