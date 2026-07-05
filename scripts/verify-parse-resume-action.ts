import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';

async function main() {
  const { parseResumeAction } = await import('../src/app/candidates/new/actions');

  const pdfPath = 'C:\\Users\\Acer\\AppData\\Local\\Temp\\claude\\C--Users-Acer-Downloads-Claude-Projects\\0f34e1db-38ff-4cd7-8e17-7ad53b39a1ff\\scratchpad\\jane-doe-resume.pdf';
  const buffer = fs.readFileSync(pdfPath);
  const file = new File([buffer], 'jane-doe-resume.pdf', { type: 'application/pdf' });

  const fd = new FormData();
  fd.set('resume', file);

  const result = await parseResumeAction(fd);
  console.log(JSON.stringify(result, null, 2));
  console.log('---checks---');
  console.log('result non-null:', result !== null);
  if (result) {
    console.log('has summary:', result.summary.length > 0);
    console.log('has at least one non-null field:', Object.values(result.fields).some((v) => v !== null));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
