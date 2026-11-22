export type SignInIntent = 'comment' | 'admin';

const REPOSITORY_SCOPE = 'public_repo';

export function parseSignInIntent(value: string | null): SignInIntent {
  return value === 'admin' ? 'admin' : 'comment';
}

export function oauthScopeForIntent(intent: SignInIntent): string {
  return intent === 'admin' ? REPOSITORY_SCOPE : '';
}
