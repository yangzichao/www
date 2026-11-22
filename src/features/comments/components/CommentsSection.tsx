import { useEffect, useState } from 'react';
import type { PublicViewer } from '../../auth/session-user';
import type { PublicComment } from '../comment-types';
import { approveCommentById, deleteCommentById, fetchCommentThread, signOut } from './comments-api';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import './comments.css';

interface CommentsSectionProps {
  pagePath: string;
}

export default function CommentsSection({ pagePath }: CommentsSectionProps) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [viewer, setViewer] = useState<PublicViewer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchCommentThread(pagePath)
      .then((thread) => {
        setComments(thread.comments);
        setViewer(thread.viewer);
      })
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setIsLoaded(true));
  }, [pagePath]);

  const canModerate = viewer?.isAdmin ?? false;
  const visibleComments = comments.filter((comment) => comment.status === 'published' || canModerate);

  function handlePosted(comment: PublicComment) {
    if (comment.status === 'published' || canModerate) setComments((current) => [...current, comment]);
  }

  async function handleApprove(commentId: string) {
    await approveCommentById(commentId);
    setComments((current) =>
      current.map((comment) => (comment.id === commentId ? { ...comment, status: 'published' } : comment)),
    );
  }

  async function handleDelete(commentId: string) {
    await deleteCommentById(commentId);
    setComments((current) => current.filter((comment) => comment.id !== commentId));
  }

  async function handleSignOut() {
    await signOut();
    setViewer(null);
  }

  return (
    <section className="comments" id="comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="comments-heading">
        Comments{visibleComments.length > 0 && <span className="comments-count">{visibleComments.length}</span>}
      </h2>
      {loadError && <p className="comment-status">Comments could not be loaded: {loadError}</p>}
      {isLoaded && visibleComments.length === 0 && !loadError && (
        <p className="comments-empty">No comments yet. Be the first.</p>
      )}
      {visibleComments.length > 0 && (
        <ul className="comment-list">
          {visibleComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canModerate={canModerate}
              onApprove={handleApprove}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
      {isLoaded && <CommentForm pagePath={pagePath} viewer={viewer} onPosted={handlePosted} onSignOut={handleSignOut} />}
    </section>
  );
}
