'use server';

import { updateOpening } from '@/lib/db/openings';
import { redirect } from 'next/navigation';
import type { Priority } from '@/lib/types';

export async function updateOpeningAction(openingId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '');
  if (!title.trim()) throw new Error('Title is required');
  await updateOpening(openingId, {
    title,
    department: String(formData.get('department') ?? '') || null,
    level: String(formData.get('level') ?? '') || null,
    description: String(formData.get('description') ?? '') || null,
    hiring_manager: String(formData.get('hiring_manager') ?? '') || null,
    positions_count: Number(formData.get('positions_count') ?? 1),
    priority: (formData.get('priority') as Priority) ?? 'normal',
    target_close_date: String(formData.get('target_close_date') ?? '') || null,
  });
  redirect(`/openings/${openingId}`);
}
