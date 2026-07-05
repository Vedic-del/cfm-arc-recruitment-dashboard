import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { groqChatCompletion } = await import('../src/lib/groqClient');
  const result = await groqChatCompletion('Reply with exactly the word: OK');
  console.log('Groq response:', JSON.stringify(result));
  console.log('Contains OK:', result.trim().includes('OK'));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
