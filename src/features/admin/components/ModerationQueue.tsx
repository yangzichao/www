import { useEffect, useState } from 'react';
import { CommentItem } from '../../comments/components/CommentItem';
import { approveCommentById, deleteCommentById } from '../../comments/components/comments-api';
import type { PublicComment } from '../../comments/comment-types';
import { describeError } from '../../http/describe-error';
import { fetchModerationQueue } from './admin-api';
import '../../comments/components/comments.css';
import './admin.css';

function CommentGroup({
  title,
  comments,
  onApprove,
  onDelete,
}: {
  title: string;
  comments: PublicComment[];
  onApprove: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}) {
  return (
    <section className="admin-moderation-group">
      <h2>
        {title} <span className="comments-count">{comments.length}</span>
      </h2>
      {comments.length === 0 ? (
        <p className="admin-hint">Nothing here.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="admin-moderation-item">
              <a className="admin-hint" href={`${comment.pagePath}#comments`}>
                {comment.pagePath}
              </a>
              <ul className="comment-list">
                <CommentItem comment={comment} canModerate onApprove={onApprove} onDelete={onDelete} />
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ModerationQueue() {
  const [pending, setPending] = useState<PublicComment[]>([]);
  const [recent, setRecent] = useState<PublicComment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchModerationQueue()
      .then((queue) => {
        setPending(queue.pending);
        setRecent(queue.recent);
      })
      .catch((error: unknown) => {
        setLoadError(describeError(error, 'Unknown error.'));
      });
  }, []);

  function runAction(action: () => Promise<void>) {
    setActionError(null);
    action().catch((error: unknown) => {
      setActionError(describeError(error, 'Something went wrong. Please try again.'));
    });
  }

  function handleApprove(commentId: string) {
    runAction(async () => {
      await approveCommentById(commentId);
      const approved = pending.find((comment) => comment.id === commentId);
      setPending((current) => current.filter((comment) => comment.id !== commentId));
      if (approved) setRecent((current) => [{ ...approved, status: 'published' }, ...current]);
    });
  }

  function handleDelete(commentId: string) {
    runAction(async () => {
      await deleteCommentById(commentId);
      setPending((current) => current.filter((comment) => comment.id !== commentId));
      setRecent((current) => current.filter((comment) => comment.id !== commentId));
    });
  }

  if (loadError) return <p className="admin-hint">{loadError}</p>;

  return (
    <div className="admin-moderation">
      {actionError && (
        <p className="admin-hint" role="alert">
          {actionError}
        </p>
      )}
      <CommentGroup title="Pending review" comments={pending} onApprove={handleApprove} onDelete={handleDelete} />
      <CommentGroup title="Recently published" comments={recent} onApprove={handleApprove} onDelete={handleDelete} />
    </div>
  );
}
