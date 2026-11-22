export function adminSignInUrl(returnPath: string): string {
  const params = new URLSearchParams({ intent: 'admin', return_to: returnPath });
  return `/auth/github/login?${params}`;
}

export function commentSignInUrl(returnPath: string): string {
  const params = new URLSearchParams({ intent: 'comment', return_to: returnPath });
  return `/auth/github/login?${params}`;
}
