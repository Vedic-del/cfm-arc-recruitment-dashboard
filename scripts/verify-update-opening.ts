import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening, getOpening, updateOpening } = await import('../src/lib/db/openings');

  const opening = await createOpening({ title: 'Update Verify Role' });
  console.log('Created without description, description is null:', opening.description === null);

  await updateOpening(opening.id, { title: 'Update Verify Role (edited)', description: 'Own the recovery pipeline end to end.' });
  const updated = await getOpening(opening.id);
  console.log('Title updated:', updated?.title === 'Update Verify Role (edited)');
  console.log('Description set:', updated?.description === 'Own the recovery pipeline end to end.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
