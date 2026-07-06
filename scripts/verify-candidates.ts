// dotenv.config() must run before the data-layer module is imported, not just
// textually above it — see the note in scripts/verify-openings.ts (Task 4)
// for why a static top-level import would silently break this.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createCandidate, getCandidate, listCandidates } = await import('../src/lib/db/candidates');

  const candidate = await createCandidate({
    name: 'Verification Test Candidate',
    years_experience_total: 5,
    expected_salary: 1200000,
    source: 'referral',
    tags: 'verification',
  });
  console.log('Created:', candidate.id);

  const fetched = await getCandidate(candidate.id);
  console.log('Fetched name matches:', fetched?.name === 'Verification Test Candidate');

  const { candidates: filtered, total } = await listCandidates({ minExperience: 3, query: 'Verification' });
  console.log('Appears in filtered list:', filtered.some((c) => c.id === candidate.id), '| total:', total);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
