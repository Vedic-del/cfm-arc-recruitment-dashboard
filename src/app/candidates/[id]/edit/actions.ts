'use server';

import { updateCandidate } from '@/lib/db/candidates';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateCandidateAction(candidateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '');
  if (!name.trim()) throw new Error('Name is required');
  await updateCandidate(candidateId, {
    name,
    phone: String(formData.get('phone') ?? '') || null,
    email: String(formData.get('email') ?? '') || null,
    location: String(formData.get('location') ?? '') || null,
    current_employer: String(formData.get('current_employer') ?? '') || null,
    current_designation: String(formData.get('current_designation') ?? '') || null,
    years_experience_total: formData.get('years_experience_total')
      ? Number(formData.get('years_experience_total'))
      : null,
    years_experience_relevant: formData.get('years_experience_relevant')
      ? Number(formData.get('years_experience_relevant'))
      : null,
    current_salary: formData.get('current_salary') ? Number(formData.get('current_salary')) : null,
    expected_salary: formData.get('expected_salary')
      ? Number(formData.get('expected_salary'))
      : null,
    notice_period: String(formData.get('notice_period') ?? '') || null,
    source: String(formData.get('source') ?? '') || null,
    tags: String(formData.get('tags') ?? '') || null,
  });
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath('/candidates');
  redirect(`/candidates/${candidateId}`);
}
