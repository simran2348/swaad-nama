import { showToast } from '@devvit/web/client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ImportPostResponse } from '../../shared/api';
import { createReview, importPost } from '../lib/api';
import { draftToRequest, emptyDraft, isDraftComplete } from '../lib/draft';
import { useTheme } from '../lib/theme';
import { Carousel } from './Carousel';
import { ThemeSurface } from './FoodBackground';
import { ReviewFields, type ReviewDraft } from './ReviewFields';
import {
  BackButton,
  EmptyState,
  LoadingState,
  ScreenHeader,
  Spinner,
} from './ui';
import { ArrowRightIcon } from './icons';

type Item = {
  post: ImportPostResponse;
  draft: ReviewDraft;
  /** The photo shown for the rating. */
  cover: string | undefined;
};

/**
 * The post's photos; with several, the one in view (swipe or tap a dot)
 * becomes the rating photo.
 */
const CoverPicker = ({
  images,
  onPick,
}: {
  images: string[];
  onPick: (url: string) => void;
}) => {
  if (images.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Carousel
        images={images}
        className="h-40 rounded-xl shadow-sm"
        onIndexChange={(i) => {
          const url = images[i];
          if (url) onPick(url);
        }}
      />
      {images.length > 1 && (
        <p className="text-center text-xs text-muted">
          Swipe to choose the photo for this rating.
        </p>
      )}
    </div>
  );
};

/**
 * Full-screen, one-post-per-step preview of the posts being added to the
 * tier list. Each step can be edited (food category, café, rating, …);
 * the last step submits them all.
 */
export const ImportWizard = ({
  postIds,
  foods,
  onCancel,
  onDone,
}: {
  postIds: string[];
  foods: string[];
  onCancel: () => void;
  /** Called with the posts that were added and their ratings. */
  onDone: (added: { postId: string; rating: number }[]) => void;
}) => {
  const [items, setItems] = useState<Item[] | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Load every selected post up front so the steps don't wait.
  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled(postIds.map((id) => importPost(id))).then(
      (results) => {
        if (cancelled) return;
        const loaded = results.flatMap((r) =>
          r.status === 'fulfilled'
            ? [
                {
                  post: r.value,
                  draft: {
                    ...emptyDraft(),
                    title: r.value.title,
                    // Long posts are trimmed to the review length limit.
                    review: r.value.body.slice(0, 2000),
                  },
                  cover: r.value.images[0],
                },
              ]
            : []
        );
        const failed = results.length - loaded.length;
        if (failed) {
          showToast(
            `Couldn't load ${failed} ${failed === 1 ? 'post' : 'posts'}; skipping.`
          );
        }
        setItems(loaded);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [postIds]);

  const item = items?.[step];
  const isLast = items ? step === items.length - 1 : false;

  const updateItem = (change: (it: Item) => Item) =>
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === step ? change(it) : it)) : prev
    );
  const update = (patch: Partial<ReviewDraft>) =>
    updateItem((it) => ({ ...it, draft: { ...it.draft, ...patch } }));

  const submit = async () => {
    if (!items || submitting) return;
    setSubmitting(true);
    const added: { postId: string; rating: number }[] = [];
    for (const { post, draft, cover } of items) {
      try {
        await createReview(draftToRequest(draft, post.postId, cover));
        added.push({ postId: post.postId, rating: draft.rating });
      } catch (err) {
        console.error(`Failed to add post ${post.postId}`, err);
      }
    }
    setSubmitting(false);
    const failed = items.length - added.length;
    showToast(
      failed
        ? `Added ${added.length}; ${failed} couldn't be added.`
        : `Added ${added.length} to your tier list!`
    );
    onDone(added);
  };

  // Rendered at the page root so the bottom nav can't cover the Submit button.
  return createPortal(
    <div className="fixed inset-0 z-30 mx-auto flex max-w-[768px] flex-col">
      <ThemeSurface
        palette={useTheme()}
        withArt={false}
        className="absolute inset-0 -z-10"
      />
      <ScreenHeader
        title="Add to tier"
        compact
        {...(items && items.length > 0
          ? { subtitle: `Post ${step + 1} of ${items.length}` }
          : {})}
        left={
          <BackButton
            onClick={() => (step > 0 ? setStep(step - 1) : onCancel())}
          />
        }
      />
      {items && items.length > 1 && (
        <div className="h-1 bg-line">
          <div
            className="h-full bg-cta transition-all"
            style={{ width: `${((step + 1) / items.length) * 100}%` }}
          />
        </div>
      )}

      {!items ? (
        <LoadingState label="Loading your posts…" />
      ) : !item ? (
        <EmptyState>None of those posts could be loaded.</EmptyState>
      ) : (
        <>
          <main
            // Re-mount per step so scroll position and pickers reset.
            key={item.post.postId}
            className="scroll-area mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-8"
          >
            <h2 className="text-lg font-extrabold leading-snug text-ink">
              {item.post.title}
            </h2>
            <CoverPicker
              images={item.post.images}
              onPick={(cover) => updateItem((it) => ({ ...it, cover }))}
            />
            {/* Title and text come from the post itself. */}
            <ReviewFields
              ratingOnly
              draft={item.draft}
              foods={foods}
              onChange={update}
            />
          </main>

          <div className="flex gap-2 border-t border-line bg-surface px-4 py-3 backdrop-blur">
            <button
              onClick={() => (step > 0 ? setStep(step - 1) : onCancel())}
              className="rounded-full border border-line bg-soft px-5 py-2.5 text-sm font-bold text-soft-ink cursor-pointer hover:brightness-95"
            >
              {step > 0 ? 'Back' : 'Cancel'}
            </button>
            <button
              disabled={!isDraftComplete(item.draft) || submitting}
              onClick={() => (isLast ? void submit() : setStep(step + 1))}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cta px-4 py-2.5 font-bold text-cta-ink shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" /> Adding…
                </>
              ) : isLast ? (
                `Submit${items.length > 1 ? ` all ${items.length}` : ''}`
              ) : (
                <>
                  Next <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          {!isDraftComplete(item.draft) && (
            <p className="bg-surface px-4 pb-3 text-center text-xs text-muted">
              Add a food category, café and rating to continue.
            </p>
          )}
        </>
      )}
    </div>,
    document.body
  );
};
