import { navigateTo } from '@devvit/web/client';
import { useEffect, useState } from 'react';
import type { PostDetailResponse } from '../../shared/api';
import { fetchPost } from '../lib/api';
import { formatDate, redditPostUrl } from '../lib/format';
import { Modal, PostContent } from './Modal';
import { EmptyState, LoadingState } from './ui';

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
          icon: '↗',
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
          meta={`u/${result.post.author} · ${formatDate(result.post.postedAt)}`}
          body={result.post.body}
        />
      )}
    </Modal>
  );
};
