import { supabase } from '@/lib/supabaseClient';
import type { Scorecard, Stage } from '@/lib/types';

export async function generateScorecard(candidateOpeningId: string, stage: Stage): Promise<string> {
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from('scorecards')
    .insert({ candidate_opening_id: candidateOpeningId, stage, token });
  if (error) throw new Error(`generateScorecard failed: ${error.message}`);
  return token;
}

export interface ScorecardWithContext extends Scorecard {
  candidateName: string;
  openingTitle: string;
}

interface ScorecardRow extends Scorecard {
  candidate_openings: {
    candidates: { name: string };
    openings: { title: string };
  };
}

export async function getScorecardByToken(token: string): Promise<ScorecardWithContext | null> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*, candidate_openings(candidates(name), openings(title))')
    .eq('token', token)
    .single();
  if (error) return null;
  const row = data as ScorecardRow;
  return {
    ...row,
    candidateName: row.candidate_openings.candidates.name,
    openingTitle: row.candidate_openings.openings.title,
  };
}

export async function submitScorecard(token: string, score: string, comments: string): Promise<void> {
  const { error } = await supabase
    .from('scorecards')
    .update({ score, comments, submitted_at: new Date().toISOString() })
    .eq('token', token);
  if (error) throw new Error(`submitScorecard failed: ${error.message}`);
}

export async function getScorecardsForCandidateOpening(
  candidateOpeningId: string
): Promise<Scorecard[]> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('candidate_opening_id', candidateOpeningId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getScorecardsForCandidateOpening failed: ${error.message}`);
  return data as Scorecard[];
}

export async function getScorecardsForOpening(
  openingId: string
): Promise<Record<string, Scorecard[]>> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*, candidate_openings!inner(opening_id)')
    .eq('candidate_openings.opening_id', openingId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getScorecardsForOpening failed: ${error.message}`);
  const map: Record<string, Scorecard[]> = {};
  for (const row of data as Scorecard[]) {
    (map[row.candidate_opening_id] ??= []).push(row);
  }
  return map;
}
