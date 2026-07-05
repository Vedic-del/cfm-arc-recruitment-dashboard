import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening, deleteOpening, getOpening } = await import('../src/lib/db/openings');
  const { createCandidate, deleteCandidate, getCandidate } = await import('../src/lib/db/candidates');
  const { linkCandidateToOpening } = await import('../src/lib/db/pipeline');
  const { supabase } = await import('../src/lib/supabaseClient');

  // Case 1: delete a candidate -> their pipeline link should go, opening should survive.
  const openingA = await createOpening({ title: 'Delete Cascade Verify Role A' });
  const candidateA = await createCandidate({ name: 'Delete Cascade Verify Candidate A' });
  const linkA = await linkCandidateToOpening(candidateA.id, openingA.id);

  await deleteCandidate(candidateA.id);

  const candidateAGone = (await getCandidate(candidateA.id)) === null;
  const openingASurvived = (await getOpening(openingA.id)) !== null;
  const { data: linkARow } = await supabase.from('candidate_openings').select('id').eq('id', linkA.id).maybeSingle();
  const linkAGone = linkARow === null;

  console.log('Case 1 (delete candidate):');
  console.log('  candidate gone:', candidateAGone);
  console.log('  opening survived:', openingASurvived);
  console.log('  pipeline link gone:', linkAGone);

  await deleteOpening(openingA.id); // cleanup

  // Case 2: delete an opening -> its pipeline link should go, candidate should survive.
  const openingB = await createOpening({ title: 'Delete Cascade Verify Role B' });
  const candidateB = await createCandidate({ name: 'Delete Cascade Verify Candidate B' });
  const linkB = await linkCandidateToOpening(candidateB.id, openingB.id);

  await deleteOpening(openingB.id);

  const openingBGone = (await getOpening(openingB.id)) === null;
  const candidateBSurvived = (await getCandidate(candidateB.id)) !== null;
  const { data: linkBRow } = await supabase.from('candidate_openings').select('id').eq('id', linkB.id).maybeSingle();
  const linkBGone = linkBRow === null;

  console.log('Case 2 (delete opening):');
  console.log('  opening gone:', openingBGone);
  console.log('  candidate survived:', candidateBSurvived);
  console.log('  pipeline link gone:', linkBGone);

  await deleteCandidate(candidateB.id); // cleanup

  const allPassed =
    candidateAGone && openingASurvived && linkAGone && openingBGone && candidateBSurvived && linkBGone;
  console.log('ALL CHECKS PASSED:', allPassed);
  if (!allPassed) process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
