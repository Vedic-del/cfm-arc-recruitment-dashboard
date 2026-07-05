import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createCandidate, getCandidate, updateCandidate } = await import('../src/lib/db/candidates');

  const candidate = await createCandidate({ name: 'Update Verify Candidate' });
  console.log('Created, years_experience_total is null:', candidate.years_experience_total === null);

  await updateCandidate(candidate.id, {
    name: 'Update Verify Candidate',
    years_experience_total: 6,
    current_salary: 1400000,
    expected_salary: 1800000,
    notice_period: '30 days',
  });
  const updated = await getCandidate(candidate.id);
  console.log('years_experience_total set:', updated?.years_experience_total === 6);
  console.log('notice_period set:', updated?.notice_period === '30 days');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
