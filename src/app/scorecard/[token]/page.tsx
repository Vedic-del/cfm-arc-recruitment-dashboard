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
  if (!scorecard) return <div>Scorecard link not found.</div>;

  if (scorecard.submitted_at || sp.submitted) {
    return <div className="max-w-md">Thank you — feedback for {scorecard.candidateName} has been recorded.</div>;
  }

  const boundAction = submitScorecardAction.bind(null, token);

  return (
    <form action={boundAction} className="max-w-md flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Interview Feedback</h1>
      <p>Candidate: {scorecard.candidateName}</p>
      <p>Role: {scorecard.openingTitle}</p>
      <p>Stage: {scorecard.stage}</p>
      <select name="score" required defaultValue="" className="border p-2 rounded">
        <option value="" disabled>Select outcome</option>
        <option value="Select">Select</option>
        <option value="Hold">Hold</option>
        <option value="Reject">Reject</option>
      </select>
      <textarea name="comments" placeholder="Comments" className="border p-2 rounded" rows={4} />
      <button type="submit" className="bg-blue-600 text-white rounded p-2">Submit Feedback</button>
    </form>
  );
}
