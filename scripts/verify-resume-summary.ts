import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { summarizeResume } = await import('../src/lib/resumeSummary');
  const sampleResume = `
Jane Doe
Software Engineer with 6 years of experience in backend development.
Skills: Node.js, TypeScript, PostgreSQL, AWS.
Education: B.Tech Computer Science, IIT Bombay.
Experience: Senior Engineer at Acme Corp (2021-present), Engineer at Globex (2018-2021).
`;
  const summary = await summarizeResume(sampleResume);
  console.log('Summary:', summary);
  console.log('Mentions Node.js:', summary.toLowerCase().includes('node'));
  console.log('Under 250 words:', summary.split(/\s+/).length < 250);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
