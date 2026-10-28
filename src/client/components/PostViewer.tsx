import { navigateTo } from '@devvit/web/client';
import { useEffect, useState } from 'react';
import type { PostDetailResponse } from '../../shared/api';
import { fetchPost } from '../lib/api';
import { formatDate, redditPostUrl } from '../lib/format';
import { ExternalLinkIcon } from './icons';
import { CalendarIcon } from './icons';
import { Modal, PostContent } from './Modal';
import { EmptyState, LoadingState } from './ui';
import { Username } from './Username';

type Result =
  { ok: true; post: PostDetailResponse } | { ok: false; error: string };

/** Full-screen page for a Reddit post (My List): photos, title, date, body. */
export const PostViewer = ({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) => {
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    let cancelled = false;
    fetchPost(postId)
      .then((post) => !cancelled && setResult({ ok: true, post }))
      .catch((err: Error) => {
        if (!cancelled) setResult({ ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const post = result?.ok ? result.post : null;

  return (
    <Modal
      label={post?.title ?? 'Post'}
      images={post?.images ?? []}
      actions={[
        {
          label: 'View on Reddit',
          icon: ExternalLinkIcon,
          onSelect: () => navigateTo(redditPostUrl(postId)),
        },
      ]}
      onClose={onClose}
    >
      {!result ? (
        <LoadingState />
      ) : !result.ok ? (
        <div className="px-4">
          <EmptyState>Couldn't load this post: {result.error}</EmptyState>
        </div>
      ) : (
        <PostContent
          title={result.post.title}
          meta={
            <>
              <Username name={result.post.author} />
              <span aria-hidden>·</span>
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{formatDate(result.post.postedAt)}</span>
            </>
          }
          body={result.post.body}
        />
      )}
    </Modal>
  );
};
