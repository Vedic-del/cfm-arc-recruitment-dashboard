'use server';

import { createCandidate, uploadResume } from '@/lib/db/candidates';
import { linkCandidateToOpening } from '@/lib/db/pipeline';
import { redirect } from 'next/navigation';

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
  });

  const resumeFile = formData.get('resume') as File | null;
  if (resumeFile && resumeFile.size > 0) {
    await uploadResume(candidate.id, resumeFile);
  }

  await linkCandidateToOpening(candidate.id, openingId);
  redirect(`/candidates/${candidate.id}`);
}
