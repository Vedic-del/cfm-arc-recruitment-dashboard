// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// NOW import modules that depend on process.env
async function main() {
  const { createOpening, listOpenings, getOpening, updateOpeningStatus, averageTimeToFill } = await import('../src/lib/db/openings');

  const opening = await createOpening({ title: 'Verification Test Role', department: 'QA' });
  console.log('Created:', opening.id);

  const fetched = await getOpening(opening.id);
  console.log('Fetched title matches:', fetched?.title === 'Verification Test Role');

  const all = await listOpenings();
  console.log('Appears in list:', all.some((o) => o.id === opening.id));

  await updateOpeningStatus(opening.id, 'filled');
  const filled = await getOpening(opening.id);
  console.log('Marked filled, filled_at set:', filled?.filled_at !== null);

  const avg = await averageTimeToFill();
  console.log('Average time to fill (days):', avg);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
