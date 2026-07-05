import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening, deleteOpening, getOpening } = await import('../src/lib/db/openings');
  const { createCandidate, deleteCandidate, getCandidate } = await import('../src/lib/db/candidates');
  const { linkCandidateToOpening } = await import('../src/lib/db/pipeline');
  const { supabase } = await import('../src/lib/supabaseClient');

  const opening = await createOpening({ title: 'Delete Cascade Verify Role' });
  const candidate = await createCandidate({ name: 'Delete Cascade Verify Candidate' });
  const co = await linkCandidateToOpening(candidate.id, opening.id);
  console.log('Created opening', opening.id, 'candidate', candidate.id, 'link', co.id);

  let openingDeleteThrew = false;
  try {
    await deleteOpening(opening.id);
  } catch (e) {
    openingDeleteThrew = true;
    console.log('deleteOpening threw as expected pre-migration:', (e as Error).message.slice(0, 120));
  }
  console.log('opening delete blocked by FK (expected true pre-migration):', openingDeleteThrew);

  const candidateStillExists = (await getCandidate(candidate.id)) !== null;
  const openingStillExists = (await getOpening(opening.id)) !== null;
  console.log('candidate still exists after blocked opening delete:', candidateStillExists);
  console.log('opening still exists after blocked delete:', openingStillExists);

  // Manual cleanup respecting current (pre-migration) FK constraints.
  await supabase.from('pipeline_events').delete().eq('candidate_opening_id', co.id);
  await supabase.from('scorecards').delete().eq('candidate_opening_id', co.id);
  await supabase.from('candidate_openings').delete().eq('id', co.id);
  await deleteCandidate(candidate.id);
  await deleteOpening(opening.id);
  console.log('cleanup done, opening gone:', (await getOpening(opening.id)) === null, 'candidate gone:', (await getCandidate(candidate.id)) === null);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
