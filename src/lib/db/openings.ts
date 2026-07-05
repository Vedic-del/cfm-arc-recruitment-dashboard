import { supabase } from '@/lib/supabaseClient';
import type { Opening, OpeningStatus, Priority } from '@/lib/types';
import { timeToFill } from '@/lib/pipelineLogic';

export interface CreateOpeningInput {
  title: string;
  department?: string;
  level?: string;
  description?: string;
  hiring_manager?: string;
  positions_count?: number;
  date_opened?: string;
  priority?: Priority;
  target_close_date?: string;
}

export async function createOpening(input: CreateOpeningInput): Promise<Opening> {
  const { data, error } = await supabase.from('openings').insert(input).select().single();
  if (error) throw new Error(`createOpening failed: ${error.message}`);
  return data as Opening;
}

export async function listOpenings(): Promise<Opening[]> {
  const { data, error } = await supabase
    .from('openings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listOpenings failed: ${error.message}`);
  return data as Opening[];
}

export async function getOpening(id: string): Promise<Opening | null> {
  const { data, error } = await supabase.from('openings').select('*').eq('id', id).single();
  if (error) return null;
  return data as Opening;
}

export async function updateOpeningStatus(id: string, status: OpeningStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'filled') patch.filled_at = new Date().toISOString();
  const { error } = await supabase.from('openings').update(patch).eq('id', id);
  if (error) throw new Error(`updateOpeningStatus failed: ${error.message}`);
}

export interface UpdateOpeningInput {
  title: string;
  department?: string | null;
  level?: string | null;
  description?: string | null;
  hiring_manager?: string | null;
  positions_count?: number;
  priority?: Priority;
  target_close_date?: string | null;
}

export async function updateOpening(id: string, input: UpdateOpeningInput): Promise<void> {
  const { error } = await supabase.from('openings').update(input).eq('id', id);
  if (error) throw new Error(`updateOpening failed: ${error.message}`);
}

export async function deleteOpening(id: string): Promise<void> {
  const { error } = await supabase.from('openings').delete().eq('id', id);
  if (error) throw new Error(`deleteOpening failed: ${error.message}`);
}

export async function averageTimeToFill(): Promise<number | null> {
  const { data, error } = await supabase
    .from('openings')
    .select('date_opened, filled_at')
    .not('filled_at', 'is', null);
  if (error) throw new Error(`averageTimeToFill failed: ${error.message}`);
  const rows = data as { date_opened: string; filled_at: string }[];
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + timeToFill(r.date_opened, r.filled_at), 0);
  return total / rows.length;
}
