import { getCandidate, getResumeUrl } from '@/lib/db/candidates';
import { getCandidateOpenings, getPipelineHistory } from '@/lib/db/pipeline';
import { getScorecardsForCandidateOpening } from '@/lib/db/scorecards';
import { listOpenings } from '@/lib/db/openings';
import { linkToOpeningAction } from './actions';

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) return <div>Candidate not found</div>;

  const candidateOpenings = await getCandidateOpenings(id);
  const openings = await listOpenings();
  const boundAction = linkToOpeningAction.bind(null, candidate.id);

  const pipelineDetails = await Promise.all(
    candidateOpenings.map(async (co) => ({
      co,
      history: await getPipelineHistory(co.id),
      scorecards: await getScorecardsForCandidateOpening(co.id),
    }))
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">{candidate.name}</h1>
      <p className="text-sm text-gray-600">{candidate.current_designation} at {candidate.current_employer}</p>
      <dl className="grid grid-cols-2 gap-2 mt-4 text-sm">
        <dt className="font-medium">Phone</dt><dd>{candidate.phone}</dd>
        <dt className="font-medium">Email</dt><dd>{candidate.email}</dd>
        <dt className="font-medium">Location</dt><dd>{candidate.location}</dd>
        <dt className="font-medium">Experience (total)</dt><dd>{candidate.years_experience_total}</dd>
        <dt className="font-medium">Experience (relevant)</dt><dd>{candidate.years_experience_relevant}</dd>
        <dt className="font-medium">Current salary</dt><dd>{candidate.current_salary}</dd>
        <dt className="font-medium">Expected salary</dt><dd>{candidate.expected_salary}</dd>
        <dt className="font-medium">Notice period</dt><dd>{candidate.notice_period}</dd>
        <dt className="font-medium">Source</dt><dd>{candidate.source}</dd>
        <dt className="font-medium">Tags</dt><dd>{candidate.tags}</dd>
      </dl>
      {candidate.resume_path && (
        <a href={getResumeUrl(candidate.resume_path)} target="_blank" className="text-blue-600 underline block mt-2">
          View resume
        </a>
      )}

      <h2 className="text-lg font-semibold mt-6">Pipeline history</h2>
      {pipelineDetails.map(({ co, history, scorecards }) => (
        <div key={co.id} className="border rounded p-3 mt-2">
          <p className="font-medium">{co.openingTitle} — {co.current_stage}</p>
          <ul className="text-sm list-disc pl-5">
            {history.map((h) => (
              <li key={h.id}>{h.stage} — {new Date(h.entered_at).toLocaleDateString()}</li>
            ))}
          </ul>
          {scorecards.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="font-medium">Scorecards</p>
              <ul className="list-disc pl-5">
                {scorecards.map((s) => (
                  <li key={s.id}>
                    {s.stage}: {s.submitted_at ? `${s.score} — ${s.comments}` : 'pending'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <h2 className="text-lg font-semibold mt-6">Link to another opening</h2>
      <form action={boundAction} className="flex gap-2 mt-2">
        <select name="opening_id" required defaultValue="" className="border p-2 rounded">
          <option value="" disabled>Select opening</option>
          {openings.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2">Link</button>
      </form>
    </div>
  );
}
