'use server';

import { updateCandidate } from '@/lib/db/candidates';
import { redirect } from 'next/navigation';

export async function updateCandidateAction(candidateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '');
  if (!name.trim()) throw new Error('Name is required');
  await updateCandidate(candidateId, {
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
  redirect(`/candidates/${candidateId}`);
}
