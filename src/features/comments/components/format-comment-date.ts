const commentDateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export function formatCommentDate(isoTimestamp: string): string {
  return commentDateFormat.format(new Date(isoTimestamp));
}
