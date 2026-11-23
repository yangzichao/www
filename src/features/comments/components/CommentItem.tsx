import { Button } from '@/components/ui/button';
import type { PublicComment } from '../comment-types';
import { formatCommentDate } from './format-comment-date';

const AVATAR_PIXEL_SIZE = 64;

function sizedAvatarUrl(avatarUrl: string): string {
  const url = new URL(avatarUrl);
  url.searchParams.set('s', String(AVATAR_PIXEL_SIZE));
  return url.toString();
}

interface CommentItemProps {
  comment: PublicComment;
  canModerate: boolean;
  onApprove: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}

function CommentAuthor({ comment }: { comment: PublicComment }) {
  if (comment.authorKind === 'github' && comment.githubLogin) {
    return (
      <a className="comment-author" href={`https://github.com/${comment.githubLogin}`} rel="nofollow noopener">
        {comment.githubAvatarUrl && (
          <img className="comment-avatar" src={sizedAvatarUrl(comment.githubAvatarUrl)} alt="" width={28} height={28} />
        )}
        <span>@{comment.githubLogin}</span>
      </a>
    );
  }
  return (
    <span className="comment-author">
      <span className="comment-avatar comment-avatar-anonymous" aria-hidden="true">
        {comment.authorName.charAt(0).toUpperCase()}
      </span>
      <span>{comment.authorName}</span>
    </span>
  );
}

export function CommentItem({ comment, canModerate, onApprove, onDelete }: CommentItemProps) {
  const isPending = comment.status === 'pending';
  return (
    <li className={isPending ? 'comment comment-pending' : 'comment'}>
      <div className="comment-header">
        <CommentAuthor comment={comment} />
        <time className="comment-date" dateTime={comment.createdAt}>
          {formatCommentDate(comment.createdAt)}
        </time>
        {isPending && <span className="comment-badge">Pending review</span>}
      </div>
      <p className="comment-body">{comment.body}</p>
      {canModerate && (
        <div className="comment-moderation">
          {isPending && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onApprove(comment.id);
              }}
            >
              Approve
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete(comment.id);
            }}
          >
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}
