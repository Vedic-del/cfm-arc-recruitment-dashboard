import { loginAction } from './actions';
import { SubmitButton } from '@/components/SubmitButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const gated = Boolean(process.env.APP_PASSWORD);

  return (
    <div className="mx-auto mt-16 max-w-sm animate-fade-in-up">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-forest-700 to-forest-950 text-lg font-bold text-green-100 shadow-sm">
          C
        </span>
        <h1 className="font-display text-xl font-bold tracking-tight text-forest-950">CFM ARC Recruitment</h1>
        <p className="mt-1 text-sm text-slate">Enter the team password to continue.</p>
      </div>

      {!gated ? (
        <div className="rounded-xl border border-amber-200 bg-amber-100 p-4 text-sm text-amber-800">
          No access password is set yet, so the app is currently open. Set an <code>APP_PASSWORD</code>{' '}
          environment variable to turn this gate on.
        </div>
      ) : (
        <form action={loginAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="next" value={sp.next ?? '/'} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">Password</label>
            <input
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition"
            />
          </div>
          {sp.error && <p className="text-sm text-danger">That password didn&apos;t match — try again.</p>}
          <SubmitButton
            pendingText="Checking…"
            className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign in
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
