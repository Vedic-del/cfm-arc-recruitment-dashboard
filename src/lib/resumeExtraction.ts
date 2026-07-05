import { groqChatCompletion } from '@/lib/groqClient';

export interface ExtractedResumeFields {
  phone: string | null;
  email: string | null;
  location: string | null;
  current_employer: string | null;
  current_designation: string | null;
  years_experience_total: number | null;
  years_experience_relevant: number | null;
  current_salary: number | null;
  expected_salary: number | null;
  notice_period: string | null;
}

export interface ResumeExtractionResult {
  fields: ExtractedResumeFields;
  summary: string;
}

export async function extractResumeFields(resumeText: string): Promise<ResumeExtractionResult> {
  const prompt = `You are helping an HR team pull structured fields out of a candidate's resume text, plus a short summary for later comparison against job descriptions.

Respond with ONLY a single JSON object (no markdown, no code fences, no preamble) with exactly these keys:
{
  "phone": string or null,
  "email": string or null,
  "location": string or null (city),
  "current_employer": string or null (most recent/current company name),
  "current_designation": string or null (most recent/current job title),
  "years_experience_total": number or null (total years of professional experience),
  "years_experience_relevant": number or null (years relevant to their most recent role — same as total if unclear),
  "current_salary": number or null (only if explicitly stated in the resume, digits only, no symbols/commas),
  "expected_salary": number or null (only if explicitly stated in the resume, digits only),
  "notice_period": string or null (e.g. "30 days", "immediate" — only if explicitly stated),
  "summary": string (a concise plain-text summary under 200 words covering key skills, total experience, education, and notable past employers — no markdown)
}

Leave a field null rather than guessing if the resume does not state it. Most resumes do not mention salary or notice period — null is the expected answer for those unless clearly stated.

Resume text:
"""
${resumeText}
"""`;

  const raw = await groqChatCompletion(prompt);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new Error(`extractResumeFields: Groq response was not valid JSON: ${raw}`);
  }

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    fields: {
      phone: normalizeString(parsed.phone),
      email: normalizeString(parsed.email),
      location: normalizeString(parsed.location),
      current_employer: normalizeString(parsed.current_employer),
      current_designation: normalizeString(parsed.current_designation),
      years_experience_total: normalizeNumber(parsed.years_experience_total),
      years_experience_relevant: normalizeNumber(parsed.years_experience_relevant),
      current_salary: normalizeNumber(parsed.current_salary),
      expected_salary: normalizeNumber(parsed.expected_salary),
      notice_period: normalizeString(parsed.notice_period),
    },
  };
}

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`extractResumeFields: no JSON object found in response: ${text}`);
  }
  return text.slice(start, end + 1);
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
