export type SignInIntent = 'comment' | 'admin';

export function parseSignInIntent(value: string | null): SignInIntent {
  return value === 'admin' ? 'admin' : 'comment';
}
