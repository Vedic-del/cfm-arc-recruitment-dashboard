'use server';

import { createOpening } from '@/lib/db/openings';
import { redirect } from 'next/navigation';
import type { Priority } from '@/lib/types';

export async function createOpeningAction(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  if (!title.trim()) throw new Error('Title is required');
  const opening = await createOpening({
    title,
    department: String(formData.get('department') ?? '') || undefined,
    level: String(formData.get('level') ?? '') || undefined,
    description: String(formData.get('description') ?? '') || undefined,
    hiring_manager: String(formData.get('hiring_manager') ?? '') || undefined,
    positions_count: Number(formData.get('positions_count') ?? 1),
    date_opened: String(formData.get('date_opened') ?? '') || undefined,
    priority: (formData.get('priority') as Priority) ?? 'normal',
    target_close_date: String(formData.get('target_close_date') ?? '') || undefined,
  });
  redirect(`/openings/${opening.id}`);
}
