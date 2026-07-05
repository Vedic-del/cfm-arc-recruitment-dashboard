import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening } = await import('../src/lib/db/openings');
  const { createCandidate } = await import('../src/lib/db/candidates');
  const { linkCandidateToOpening, scoreMatch } = await import('../src/lib/db/pipeline');

  const opening = await createOpening({
    title: 'Match Score Verify Role',
    description: 'Looking for a backend engineer with 5+ years of Node.js and PostgreSQL experience.',
  });
  const candidate = await createCandidate({
    name: 'Match Score Verify Candidate',
    resume_summary: 'Software engineer with 6 years of experience in Node.js, TypeScript, and PostgreSQL. B.Tech Computer Science.',
  });
  const co = await linkCandidateToOpening(candidate.id, opening.id);

  const result = await scoreMatch(co.id);
  console.log('Score:', result.score, '(expect a reasonably high number given the strong overlap)');
  console.log('Rationale:', result.rationale);
  console.log('Score is a number 0-100:', typeof result.score === 'number' && result.score >= 0 && result.score <= 100);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
