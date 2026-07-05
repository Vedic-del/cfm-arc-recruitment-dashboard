import { groqChatCompletion } from '@/lib/groqClient';

export async function summarizeResume(resumeText: string): Promise<string> {
  const prompt = `You are helping an HR team extract structured, useful information from a candidate's resume for later comparison against job descriptions.

Given the raw resume text below, produce a concise plain-text summary covering:
- Key technical/professional skills
- Total years of experience mentioned (if determinable)
- Education (degree, institution)
- Notable past employers/roles

Keep it under 200 words, no markdown formatting, no preamble — just the summary itself.

Resume text:
"""
${resumeText}
"""`;
  return groqChatCompletion(prompt);
}
