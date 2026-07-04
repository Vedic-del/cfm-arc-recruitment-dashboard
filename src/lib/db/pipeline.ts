import { supabase } from '@/lib/supabaseClient';
import type { CandidateOpening, PipelineEvent, Stage } from '@/lib/types';
import { isStuck, averageTimeInStage } from '@/lib/pipelineLogic';

export async function linkCandidateToOpening(
  candidateId: string,
  openingId: string
): Promise<CandidateOpening> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .insert({ candidate_id: candidateId, opening_id: openingId, current_stage: 'Sourced' })
    .select()
    .single();
  if (error) throw new Error(`linkCandidateToOpening failed: ${error.message}`);
  const co = data as CandidateOpening;
  const { error: eventError } = await supabase
    .from('pipeline_events')
    .insert({ candidate_opening_id: co.id, stage: 'Sourced' });
  if (eventError) throw new Error(`linkCandidateToOpening event failed: ${eventError.message}`);
  return co;
}

export async function advanceStage(candidateOpeningId: string, newStage: Stage): Promise<void> {
  const { error: updateError } = await supabase
    .from('candidate_openings')
    .update({ current_stage: newStage })
    .eq('id', candidateOpeningId);
  if (updateError) throw new Error(`advanceStage update failed: ${updateError.message}`);
  const { error: eventError } = await supabase
    .from('pipeline_events')
    .insert({ candidate_opening_id: candidateOpeningId, stage: newStage });
  if (eventError) throw new Error(`advanceStage event failed: ${eventError.message}`);
}

export interface PipelineCard {
  candidateOpeningId: string;
  candidateId: string;
  candidateName: string;
  currentStage: Stage;
  latestEnteredAt: string;
  stuck: boolean;
}

function toPipelineCard(row: any): PipelineCard {
  const events = row.pipeline_events as PipelineEvent[];
  const latest = events.reduce((a, b) => (new Date(a.entered_at) > new Date(b.entered_at) ? a : b));
  return {
    candidateOpeningId: row.id,
    candidateId: row.candidate_id,
    candidateName: row.candidates.name,
    currentStage: row.current_stage,
    latestEnteredAt: latest.entered_at,
    stuck: isStuck(events),
  };
}

export async function getPipelineForOpening(openingId: string): Promise<PipelineCard[]> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('id, current_stage, candidate_id, candidates(name), pipeline_events(stage, entered_at)')
    .eq('opening_id', openingId);
  if (error) throw new Error(`getPipelineForOpening failed: ${error.message}`);
  return (data as any[]).map(toPipelineCard);
}

export async function getPipelineHistory(candidateOpeningId: string): Promise<PipelineEvent[]> {
  const { data, error } = await supabase
    .from('pipeline_events')
    .select('*')
    .eq('candidate_opening_id', candidateOpeningId)
    .order('entered_at', { ascending: true });
  if (error) throw new Error(`getPipelineHistory failed: ${error.message}`);
  return data as PipelineEvent[];
}

export async function getCandidateOpenings(
  candidateId: string
): Promise<(CandidateOpening & { openingTitle: string })[]> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('*, openings(title)')
    .eq('candidate_id', candidateId);
  if (error) throw new Error(`getCandidateOpenings failed: ${error.message}`);
  return (data as any[]).map((row) => ({ ...row, openingTitle: row.openings.title }));
}

export async function getStuckCandidates(): Promise<PipelineCard[]> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('id, current_stage, candidate_id, candidates(name), pipeline_events(stage, entered_at)')
    .not('current_stage', 'in', '(Joined,Rejected,Dropped)');
  if (error) throw new Error(`getStuckCandidates failed: ${error.message}`);
  return (data as any[]).map(toPipelineCard).filter((c) => c.stuck);
}

export async function getStageCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('candidate_openings').select('current_stage');
  if (error) throw new Error(`getStageCounts failed: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const row of data as { current_stage: string }[]) {
    counts[row.current_stage] = (counts[row.current_stage] ?? 0) + 1;
  }
  return counts;
}

export async function getAverageTimeInStage(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('pipeline_events')
    .select('candidate_opening_id, stage, entered_at');
  if (error) throw new Error(`getAverageTimeInStage failed: ${error.message}`);
  const grouped = new Map<string, { stage: string; entered_at: string }[]>();
  for (const row of data as { candidate_opening_id: string; stage: string; entered_at: string }[]) {
    const list = grouped.get(row.candidate_opening_id) ?? [];
    list.push({ stage: row.stage, entered_at: row.entered_at });
    grouped.set(row.candidate_opening_id, list);
  }
  return averageTimeInStage(Array.from(grouped.values()));
}
