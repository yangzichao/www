function pluralizePosts(postCount: number): string {
  return `${postCount} ${postCount === 1 ? 'post' : 'posts'}`;
}

export function describePostCount(shownCount: number, totalCount: number): string {
  if (totalCount === 0) return 'No posts yet';
  if (shownCount === totalCount) return pluralizePosts(totalCount);
  return `${shownCount} of ${pluralizePosts(totalCount)}`;
}
