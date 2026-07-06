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

export interface DuplicateGroup {
  candidates: Candidate[];
}

// Group candidates that share a normalized email or phone (strong signals only —
// name alone is too noisy). Uses union-find so a chain sharing either signal
// forms one group.
export async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`findDuplicateGroups failed: ${error.message}`);
  const all = data as Candidate[];

  const parent = new Map<string, string>();
  all.forEach((c) => parent.set(c.id, c.id));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(x) !== root) {
      const nxt = parent.get(x)!;
      parent.set(x, root);
      x = nxt;
    }
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const linkBy = (key: (c: Candidate) => string) => {
    const index = new Map<string, string>();
    for (const c of all) {
      const k = key(c);
      if (!k) continue;
      const seen = index.get(k);
      if (seen) union(seen, c.id);
      else index.set(k, c.id);
    }
  };
  linkBy((c) => (c.email ?? '').trim().toLowerCase());
  linkBy((c) => {
    const digits = (c.phone ?? '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : '';
  });

  const groups = new Map<string, Candidate[]>();
  for (const c of all) {
    const root = find(c.id);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(c);
  }
  return Array.from(groups.values())
    .filter((g) => g.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map((candidates) => ({ candidates }));
}

const MERGE_FIELDS = [
  'phone', 'email', 'location', 'current_employer', 'current_designation',
  'years_experience_total', 'years_experience_relevant', 'current_salary',
  'expected_salary', 'notice_period', 'source', 'tags', 'resume_summary',
] as const;

export async function mergeCandidates(primaryId: string, duplicateIds: string[]): Promise<void> {
  const ids = duplicateIds.filter((id) => id !== primaryId);
  if (ids.length === 0) return;

  const { data, error } = await supabase.from('candidates').select('*').in('id', [primaryId, ...ids]);
  if (error) throw new Error(`mergeCandidates fetch failed: ${error.message}`);
  const rows = data as Candidate[];
  const primary = rows.find((r) => r.id === primaryId);
  if (!primary) throw new Error('mergeCandidates: primary not found');
  const dups = rows.filter((r) => ids.includes(r.id));

  // Enrich primary with any field it's missing from a duplicate.
  const primaryRec = primary as unknown as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const f of MERGE_FIELDS) {
    if (primaryRec[f] === null || primaryRec[f] === undefined || primaryRec[f] === '') {
      const val = dups
        .map((d) => (d as unknown as Record<string, unknown>)[f])
        .find((v) => v !== null && v !== undefined && v !== '');
      if (val !== undefined) patch[f] = val;
    }
  }
  if (Object.keys(patch).length > 0) {
    await supabase.from('candidates').update(patch).eq('id', primaryId);
  }

  // Re-point notes (tolerate the table not existing pre-migration).
  try {
    await supabase.from('candidate_notes').update({ candidate_id: primaryId }).in('candidate_id', ids);
  } catch {
    /* notes table may not exist yet */
  }

  // Re-point pipeline links, skipping any opening the primary is already in
  // (the duplicate's link there is dropped when the duplicate is deleted).
  const { data: primLinks } = await supabase
    .from('candidate_openings')
    .select('opening_id')
    .eq('candidate_id', primaryId);
  const primOpenings = new Set((primLinks as { opening_id: string }[] | null ?? []).map((r) => r.opening_id));
  const { data: dupLinks } = await supabase
    .from('candidate_openings')
    .select('id, opening_id')
    .in('candidate_id', ids);
  for (const link of (dupLinks as { id: string; opening_id: string }[] | null) ?? []) {
    if (!primOpenings.has(link.opening_id)) {
      await supabase.from('candidate_openings').update({ candidate_id: primaryId }).eq('id', link.id);
      primOpenings.add(link.opening_id);
    }
  }

  // Delete the duplicates; cascade clears any links/events/scorecards left on them.
  const { error: delErr } = await supabase.from('candidates').delete().in('id', ids);
  if (delErr) throw new Error(`mergeCandidates delete failed: ${delErr.message}`);
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
