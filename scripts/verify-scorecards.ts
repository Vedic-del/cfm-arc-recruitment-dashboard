// dotenv.config() must run before the data-layer modules are imported, not
// just textually above it — see the note in scripts/verify-openings.ts
// (Task 4) for why a static top-level import would silently break this.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening } = await import('../src/lib/db/openings');
  const { createCandidate } = await import('../src/lib/db/candidates');
  const { linkCandidateToOpening } = await import('../src/lib/db/pipeline');
  const {
    generateScorecard,
    getScorecardByToken,
    submitScorecard,
    getScorecardsForCandidateOpening,
  } = await import('../src/lib/db/scorecards');

  const opening = await createOpening({ title: 'Scorecard Verification Role' });
  const candidate = await createCandidate({ name: 'Scorecard Verification Candidate' });
  const co = await linkCandidateToOpening(candidate.id, opening.id);

  const token = await generateScorecard(co.id, 'Round 1');
  console.log('Generated token:', token);

  const before = await getScorecardByToken(token);
  console.log('Fetched before submit, candidate name matches:', before?.candidateName === candidate.name);
  console.log('Not yet submitted:', before?.submitted_at === null);

  await submitScorecard(token, 'Select', 'Strong candidate');

  const after = await getScorecardByToken(token);
  console.log('Submitted score recorded:', after?.score === 'Select');

  const list = await getScorecardsForCandidateOpening(co.id);
  console.log('Scorecard appears in candidate_opening list:', list.length === 1);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
