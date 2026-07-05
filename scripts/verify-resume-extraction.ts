import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { extractResumeFields } = await import('../src/lib/resumeExtraction');

  const resumeText = `Jane Doe
Senior Backend Engineer
jane.doe@example.com | +91 98765 43210 | Bangalore

Summary: 6 years of experience with Node.js, TypeScript, PostgreSQL, and AWS.

Experience:
Acme Corp — Senior Backend Engineer (2021 - Present)
Beta Inc — Backend Engineer (2019 - 2021)

Education: B.Tech Computer Science, IIT Bombay`;

  const result = await extractResumeFields(resumeText);
  console.log(JSON.stringify(result, null, 2));

  console.log('---checks---');
  console.log('email extracted:', result.fields.email === 'jane.doe@example.com');
  console.log('location extracted:', result.fields.location?.toLowerCase().includes('bangalore'));
  console.log('current employer extracted:', result.fields.current_employer?.toLowerCase().includes('acme'));
  console.log('years experience is a number close to 6:', result.fields.years_experience_total);
  console.log('salary fields correctly null (not mentioned):', result.fields.current_salary === null && result.fields.expected_salary === null);
  console.log('summary non-empty:', result.summary.length > 0);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
