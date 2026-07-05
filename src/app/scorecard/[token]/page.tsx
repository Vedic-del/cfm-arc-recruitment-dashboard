import { getScorecardByToken } from '@/lib/db/scorecards';
import { submitScorecardAction } from './actions';

export default async function ScorecardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const scorecard = await getScorecardByToken(token);

  if (!scorecard) {
    return (
      <div className="mx-auto max-w-md animate-fade-in-up rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">This feedback link isn&apos;t valid. Double-check the URL you were sent.</p>
      </div>
    );
  }

  if (scorecard.submitted_at || sp.submitted) {
    return (
      <div className="mx-auto max-w-md animate-fade-in-up rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <span className="text-2xl text-forest-900">✓</span>
        </div>
        <h1 className="font-display text-lg font-bold text-forest-950">Thank you</h1>
        <p className="mt-1 text-sm text-slate">
          Feedback for <span className="font-medium text-ink">{scorecard.candidateName}</span> has been recorded.
        </p>
      </div>
    );
  }

  const boundAction = submitScorecardAction.bind(null, token);

  return (
    <div className="mx-auto max-w-md animate-fade-in-up">
      <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Interview Feedback</h1>
      <p className="mt-1 text-sm text-slate">A couple of minutes — that&apos;s all this takes.</p>

      <form action={boundAction} className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-3 text-sm">
          <dt className="font-semibold text-slate">Candidate</dt>
          <dd className="col-span-2 text-ink">{scorecard.candidateName}</dd>
          <dt className="font-semibold text-slate">Role</dt>
          <dd className="col-span-2 text-ink">{scorecard.openingTitle}</dd>
          <dt className="font-semibold text-slate">Stage</dt>
          <dd className="col-span-2 text-ink">{scorecard.stage}</dd>
        </dl>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">Outcome</label>
          <select
            name="score"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition"
          >
            <option value="" disabled>Select outcome</option>
            <option value="Select">Select</option>
            <option value="Hold">Hold</option>
            <option value="Reject">Reject</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">Comments</label>
          <textarea
            name="comments"
            placeholder="What stood out, either way?"
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
}
