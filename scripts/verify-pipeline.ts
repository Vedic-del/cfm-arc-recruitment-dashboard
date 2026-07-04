// dotenv.config() must run before the data-layer modules are imported, not
// just textually above it — see the note in scripts/verify-openings.ts
// (Task 4) for why a static top-level import would silently break this.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening } = await import('../src/lib/db/openings');
  const { createCandidate } = await import('../src/lib/db/candidates');
  const {
    linkCandidateToOpening,
    advanceStage,
    getPipelineForOpening,
    getPipelineHistory,
    getCandidateOpenings,
    getStuckCandidates,
    getStageCounts,
  } = await import('../src/lib/db/pipeline');

  const opening = await createOpening({ title: 'Pipeline Verification Role' });
  const candidate = await createCandidate({ name: 'Pipeline Verification Candidate' });

  const co = await linkCandidateToOpening(candidate.id, opening.id);
  console.log('Linked candidate_opening:', co.id);

  await advanceStage(co.id, 'Screening');

  const cards = await getPipelineForOpening(opening.id);
  console.log('Pipeline shows current stage Screening:', cards[0]?.currentStage === 'Screening');

  const history = await getPipelineHistory(co.id);
  console.log('History has 2 events (Sourced, Screening):', history.length === 2);

  const candidateOpenings = await getCandidateOpenings(candidate.id);
  console.log('Candidate has 1 linked opening:', candidateOpenings.length === 1);

  const stageCounts = await getStageCounts();
  console.log('Stage counts includes Screening:', (stageCounts['Screening'] ?? 0) > 0);

  const stuck = await getStuckCandidates();
  console.log('Stuck list is an array:', Array.isArray(stuck));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
