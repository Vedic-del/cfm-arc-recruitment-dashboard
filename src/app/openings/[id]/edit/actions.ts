'use server';

import { updateOpening } from '@/lib/db/openings';
import { redirect } from 'next/navigation';
import type { Priority } from '@/lib/types';

export async function updateOpeningAction(openingId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '');
  if (!title.trim()) throw new Error('Title is required');
  await updateOpening(openingId, {
    title,
    department: String(formData.get('department') ?? '') || undefined,
    level: String(formData.get('level') ?? '') || undefined,
    description: String(formData.get('description') ?? '') || undefined,
    hiring_manager: String(formData.get('hiring_manager') ?? '') || undefined,
    positions_count: Number(formData.get('positions_count') ?? 1),
    priority: (formData.get('priority') as Priority) ?? 'normal',
    target_close_date: String(formData.get('target_close_date') ?? '') || undefined,
  });
  redirect(`/openings/${openingId}`);
}
