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

export async function getCandidateIdentifiers(): Promise<
  { name: string; email: string | null; phone: string | null }[]
> {
  const { data, error } = await supabase.from('candidates').select('name, email, phone');
  if (error) throw new Error(`getCandidateIdentifiers failed: ${error.message}`);
  return data as { name: string; email: string | null; phone: string | null }[];
}

export interface BulkImportResult {
  created: number;
  linkedToOpening: boolean;
}

export async function bulkCreateCandidates(
  inputs: CreateCandidateInput[],
  openingId?: string
): Promise<BulkImportResult> {
  if (inputs.length === 0) return { created: 0, linkedToOpening: false };

  const { data, error } = await supabase.from('candidates').insert(inputs).select('id');
  if (error) throw new Error(`bulkCreateCandidates failed: ${error.message}`);
  const ids = (data as { id: string }[]).map((r) => r.id);

  if (openingId) {
    const links = ids.map((candidate_id) => ({
      candidate_id,
      opening_id: openingId,
      current_stage: 'Sourced',
    }));
    const { data: linkData, error: linkErr } = await supabase
      .from('candidate_openings')
      .insert(links)
      .select('id');
    if (linkErr) throw new Error(`bulkCreateCandidates link failed: ${linkErr.message}`);
    const events = (linkData as { id: string }[]).map((l) => ({
      candidate_opening_id: l.id,
      stage: 'Sourced',
    }));
    const { error: evErr } = await supabase.from('pipeline_events').insert(events);
    if (evErr) throw new Error(`bulkCreateCandidates events failed: ${evErr.message}`);
  }

  return { created: ids.length, linkedToOpening: !!openingId };
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
  openingId?: string;
  stage?: string;
  page?: number; // 0-based
  pageSize?: number;
}

export interface CandidateListResult {
  candidates: Candidate[];
  total: number;
}

// Escape PostgREST reserved characters in a free-text ilike filter so a comma
// or paren in the query can't break out of the .or() grammar.
function escapeLike(value: string): string {
  return value.replace(/[,()]/g, ' ');
}

function orClause(query: string): string {
  const like = `%${escapeLike(query)}%`;
  return [
    `name.ilike.${like}`,
    `email.ilike.${like}`,
    `phone.ilike.${like}`,
    `current_employer.ilike.${like}`,
    `current_designation.ilike.${like}`,
    `location.ilike.${like}`,
    `tags.ilike.${like}`,
    `source.ilike.${like}`,
  ].join(',');
}

function dedupeById(rows: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return rows.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export async function listCandidates(filters: CandidateFilters = {}): Promise<CandidateListResult> {
  const pageSize = filters.pageSize ?? 50;
  const page = filters.page ?? 0;
  const useJoin = !!(filters.openingId || filters.stage);
  const select = useJoin ? '*, candidate_openings!inner(opening_id, current_stage)' : '*';

  let q = supabase
    .from('candidates')
    .select(select, { count: 'exact' })
    .order('created_at', { ascending: false });
  if (filters.query) q = q.or(orClause(filters.query));
  if (filters.minExperience !== undefined) q = q.gte('years_experience_total', filters.minExperience);
  if (filters.maxSalary !== undefined) q = q.lte('expected_salary', filters.maxSalary);
  if (filters.source) q = q.eq('source', filters.source);
  if (filters.openingId) q = q.eq('candidate_openings.opening_id', filters.openingId);
  if (filters.stage) q = q.eq('candidate_openings.current_stage', filters.stage);
  q = q.range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw new Error(`listCandidates failed: ${error.message}`);
  // A stage-only join can return the same candidate once per matching link;
  // dedupe the page by id so rows never repeat.
  const candidates = dedupeById(data as unknown as Candidate[]);
  return { candidates, total: count ?? candidates.length };
}

// Full filtered set (no pagination) for CSV export.
export async function listAllCandidatesMatching(filters: CandidateFilters = {}): Promise<Candidate[]> {
  const useJoin = !!(filters.openingId || filters.stage);
  const select = useJoin ? '*, candidate_openings!inner(opening_id, current_stage)' : '*';
  let q = supabase.from('candidates').select(select).order('created_at', { ascending: false });
  if (filters.query) q = q.or(orClause(filters.query));
  if (filters.minExperience !== undefined) q = q.gte('years_experience_total', filters.minExperience);
  if (filters.maxSalary !== undefined) q = q.lte('expected_salary', filters.maxSalary);
  if (filters.source) q = q.eq('source', filters.source);
  if (filters.openingId) q = q.eq('candidate_openings.opening_id', filters.openingId);
  if (filters.stage) q = q.eq('candidate_openings.current_stage', filters.stage);
  const { data, error } = await q;
  if (error) throw new Error(`listAllCandidatesMatching failed: ${error.message}`);
  return dedupeById(data as unknown as Candidate[]);
}

export async function getDistinctSources(): Promise<string[]> {
  const { data, error } = await supabase.from('candidates').select('source').not('source', 'is', null);
  if (error) return [];
  const set = new Set<string>();
  for (const row of data as { source: string | null }[]) {
    const s = (row.source ?? '').trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
