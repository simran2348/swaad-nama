import { Hono, type Context } from 'hono';
import type {
  OnAppInstallRequest,
  OnCommentDeleteRequest,
  OnModActionRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { removeJournalEntryIds } from '../core/journal';
import { createHubPost, getHubPostId } from '../core/post';
import { deleteReview, getReview, getReviewCommentId } from '../core/reviews';
import { takeCommentedItem } from '../core/userComments';

export const triggers = new Hono();

/**
 * Creates the SwaadNama hub post on install.
 *
 * Always responds 200: a failing install trigger blocks the install/upload,
 * so errors are logged instead. Re-running (reinstalls, playtest) is a no-op
 * once the hub post exists — mods can create another from the subreddit menu.
 */
triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest>();
    const existing = await getHubPostId();
    if (existing) {
      return c.json<TriggerResponse>(
        {
          status: 'success',
          message: `Hub post ${existing} already exists in r/${context.subredditName}; skipping (trigger: ${input.type})`,
        },
        200
      );
    }

    const post = await createHubPost();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Hub post ${post.id} created in r/${context.subredditName} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error('on-app-install: failed to create hub post:', error);
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message:
          'Install completed without hub post; create one from the subreddit menu',
      },
      200
    );
  }
});

/**
 * A rating's or journal entry's Reddit comment is gone (deleted by its
 * author, or removed by a mod): take what it was posted for out of the app,
 * so nothing shows without its comment. Returns what was removed.
 */
const removeCommentedContent = async (commentId: string): Promise<string> => {
  const item = await takeCommentedItem(commentId);
  if (!item) return 'not a SwaadNama comment';
  if (item.kind === 'journal') {
    await removeJournalEntryIds(item.username, item.ids);
    return `removed ${item.ids.length} journal entries of u/${item.username}`;
  }
  // An edited rating has a newer comment; only that one counts.
  const current = await getReviewCommentId(item.id);
  const review = await getReview(item.id);
  if (!review || (current && current !== commentId)) return 'older comment';
  await deleteReview(review);
  return `removed rating ${review.id} of u/${review.username}`;
};

/** Always 200: a failing trigger is only logged. */
const handled = (c: Context, label: string, run: () => Promise<string>) =>
  run()
    .then((message) =>
      c.json<TriggerResponse>({ status: 'success', message }, 200)
    )
    .catch((error: unknown) => {
      console.error(`${label} failed:`, error);
      return c.json<TriggerResponse>(
        { status: 'success', message: `${label} failed; logged` },
        200
      );
    });

triggers.post('/on-comment-delete', async (c) => {
  const input = await c.req.json<OnCommentDeleteRequest>();
  return handled(c, 'on-comment-delete', () =>
    removeCommentedContent(input.commentId)
  );
});

/** Mods removing a comment (or marking it spam). */
const REMOVALS = new Set(['removecomment', 'spamcomment']);

triggers.post('/on-mod-action', async (c) => {
  const input = await c.req.json<OnModActionRequest>();
  const commentId = input.targetComment?.id;
  if (!input.action || !REMOVALS.has(input.action) || !commentId) {
    return c.json<TriggerResponse>(
      { status: 'success', message: 'ignored' },
      200
    );
  }
  return handled(c, 'on-mod-action', () => removeCommentedContent(commentId));
});
