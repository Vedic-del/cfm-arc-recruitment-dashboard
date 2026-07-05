'use server';

import { createCandidate } from '@/lib/db/candidates';
import { linkCandidateToOpening } from '@/lib/db/pipeline';
import { extractResumeText } from '@/lib/resumeParsing';
import { extractResumeFields, type ExtractedResumeFields } from '@/lib/resumeExtraction';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function parseResumeAction(
  formData: FormData
): Promise<{ fields: ExtractedResumeFields; summary: string } | null> {
  const resumeFile = formData.get('resume') as File | null;
  if (!resumeFile || resumeFile.size === 0) return null;

  try {
    const text = await extractResumeText(resumeFile);
    if (!text || text.trim().length === 0) return null;
    return await extractResumeFields(text);
  } catch (error) {
    console.error('parseResumeAction failed:', error);
    return null;
  }
}

export async function createCandidateAction(formData: FormData) {
  const name = String(formData.get('name') ?? '');
  if (!name.trim()) throw new Error('Name is required');
  const openingId = String(formData.get('opening_id') ?? '');
  if (!openingId) throw new Error('An opening must be selected');

  const candidate = await createCandidate({
    name,
    phone: String(formData.get('phone') ?? '') || undefined,
    email: String(formData.get('email') ?? '') || undefined,
    location: String(formData.get('location') ?? '') || undefined,
    current_employer: String(formData.get('current_employer') ?? '') || undefined,
    current_designation: String(formData.get('current_designation') ?? '') || undefined,
    years_experience_total: formData.get('years_experience_total')
      ? Number(formData.get('years_experience_total'))
      : undefined,
    years_experience_relevant: formData.get('years_experience_relevant')
      ? Number(formData.get('years_experience_relevant'))
      : undefined,
    current_salary: formData.get('current_salary') ? Number(formData.get('current_salary')) : undefined,
    expected_salary: formData.get('expected_salary')
      ? Number(formData.get('expected_salary'))
      : undefined,
    notice_period: String(formData.get('notice_period') ?? '') || undefined,
    source: String(formData.get('source') ?? '') || undefined,
    tags: String(formData.get('tags') ?? '') || undefined,
    resume_summary: String(formData.get('resume_summary') ?? '') || undefined,
  });

  await linkCandidateToOpening(candidate.id, openingId);
  revalidatePath('/candidates');
  revalidatePath(`/openings/${openingId}`);
  revalidatePath('/');
  redirect(`/candidates/${candidate.id}`);
}
