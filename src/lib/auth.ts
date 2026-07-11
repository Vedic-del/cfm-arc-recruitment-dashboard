// Shared, secret-free helpers for the single-password access gate. Safe to
// import from both the proxy (edge/node) and Server Actions.

export const AUTH_COOKIE = 'cfmarc_auth';

// Derive an opaque cookie value from the shared password so the raw password is
// never stored in the browser. Uses Web Crypto, available in both runtimes.
export async function passwordToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`cfmarc-arc:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Only allow same-site relative paths as post-login redirect targets.
export function safeNext(next: string | undefined | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}
