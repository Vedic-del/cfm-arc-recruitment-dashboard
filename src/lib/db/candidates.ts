import { supabase } from '@/lib/supabaseClient';
import type { Candidate } from '@/lib/types';

export interface CreateCandidateInput {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  current_employer?: string;
  current_designation?: string;
  years_experience_total?: number;
  years_experience_relevant?: number;
  current_salary?: number;
  expected_salary?: number;
  notice_period?: string;
  source?: string;
  tags?: string;
}

export async function createCandidate(input: CreateCandidateInput): Promise<Candidate> {
  const { data, error } = await supabase.from('candidates').insert(input).select().single();
  if (error) throw new Error(`createCandidate failed: ${error.message}`);
  return data as Candidate;
}

export async function updateCandidate(id: string, input: CreateCandidateInput): Promise<void> {
  const { error } = await supabase.from('candidates').update(input).eq('id', id);
  if (error) throw new Error(`updateCandidate failed: ${error.message}`);
}

export async function uploadResume(candidateId: string, file: File): Promise<string> {
  const path = `${candidateId}/${file.name}`;
  const { error } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
  if (error) throw new Error(`uploadResume failed: ${error.message}`);
  const { error: updateError } = await supabase
    .from('candidates')
    .update({ resume_path: path })
    .eq('id', candidateId);
  if (updateError) throw new Error(`uploadResume update failed: ${updateError.message}`);
  return path;
}

export function getResumeUrl(resumePath: string): string {
  const { data } = supabase.storage.from('resumes').getPublicUrl(resumePath);
  return data.publicUrl;
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const { data, error } = await supabase.from('candidates').select('*').eq('id', id).single();
  if (error) return null;
  return data as Candidate;
}

export interface CandidateFilters {
  query?: string;
  minExperience?: number;
  maxSalary?: number;
  source?: string;
}

export async function listCandidates(filters: CandidateFilters = {}): Promise<Candidate[]> {
  let q = supabase.from('candidates').select('*').order('created_at', { ascending: false });
  if (filters.query) {
    q = q.or(
      `name.ilike.%${filters.query}%,tags.ilike.%${filters.query}%,source.ilike.%${filters.query}%`
    );
  }
  if (filters.minExperience !== undefined) {
    q = q.gte('years_experience_total', filters.minExperience);
  }
  if (filters.maxSalary !== undefined) {
    q = q.lte('expected_salary', filters.maxSalary);
  }
  if (filters.source) {
    q = q.eq('source', filters.source);
  }
  const { data, error } = await q;
  if (error) throw new Error(`listCandidates failed: ${error.message}`);
  return data as Candidate[];
}
