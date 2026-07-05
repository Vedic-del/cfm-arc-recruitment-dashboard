import { supabase } from '@/lib/supabaseClient';
import type { Candidate, CandidateNote } from '@/lib/types';

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
  resume_summary?: string;
}

export async function createCandidate(input: CreateCandidateInput): Promise<Candidate> {
  const { data, error } = await supabase.from('candidates').insert(input).select().single();
  if (error) throw new Error(`createCandidate failed: ${error.message}`);
  return data as Candidate;
}

export interface UpdateCandidateInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  current_employer?: string | null;
  current_designation?: string | null;
  years_experience_total?: number | null;
  years_experience_relevant?: number | null;
  current_salary?: number | null;
  expected_salary?: number | null;
  notice_period?: string | null;
  source?: string | null;
  tags?: string | null;
}

export async function updateCandidate(id: string, input: UpdateCandidateInput): Promise<void> {
  const { error } = await supabase.from('candidates').update(input).eq('id', id);
  if (error) throw new Error(`updateCandidate failed: ${error.message}`);
}

export async function deleteCandidate(id: string): Promise<void> {
  const { error } = await supabase.from('candidates').delete().eq('id', id);
  if (error) throw new Error(`deleteCandidate failed: ${error.message}`);
}

export async function deleteCandidates(ids: string[]): Promise<void> {
  const { error } = await supabase.from('candidates').delete().in('id', ids);
  if (error) throw new Error(`deleteCandidates failed: ${error.message}`);
}

export async function getCandidateNotes(candidateId: string): Promise<CandidateNote[]> {
  // Tolerant of the candidate_notes table not existing yet (pre-migration):
  // show an empty log rather than crashing the profile page.
  const { data, error } = await supabase
    .from('candidate_notes')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as CandidateNote[];
}

export async function addCandidateNote(candidateId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('candidate_notes')
    .insert({ candidate_id: candidateId, note });
  if (error) throw new Error(`addCandidateNote failed: ${error.message}`);
}

export interface DuplicateMatch {
  id: string;
  name: string;
  matchedOn: 'email' | 'phone' | 'name';
}

export async function findPotentialDuplicates(input: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  const seen = new Set<string>();

  const collect = (rows: { id: string; name: string }[] | null, matchedOn: DuplicateMatch['matchedOn']) => {
    for (const row of rows ?? []) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        matches.push({ id: row.id, name: row.name, matchedOn });
      }
    }
  };

  if (input.email) {
    const { data } = await supabase.from('candidates').select('id, name').ilike('email', input.email.trim());
    collect(data, 'email');
  }
  if (input.phone) {
    const { data } = await supabase.from('candidates').select('id, name').eq('phone', input.phone.trim());
    collect(data, 'phone');
  }
  if (input.name.trim()) {
    const { data } = await supabase.from('candidates').select('id, name').ilike('name', input.name.trim());
    collect(data, 'name');
  }
  return matches;
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
