import { supabase } from '@/lib/supabaseClient';
import type { CandidateOpening, PipelineEvent, Stage } from '@/lib/types';
import { isStuck, averageTimeInStage } from '@/lib/pipelineLogic';
import { groqChatCompletion } from '@/lib/groqClient';

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
  matchScore: number | null;
  matchRationale: string | null;
}

interface PipelineCardRow {
  id: string;
  current_stage: Stage;
  candidate_id: string;
  candidates: { name: string };
  pipeline_events: { stage: Stage; entered_at: string }[];
  match_score: number | null;
  match_rationale: string | null;
}

function toPipelineCard(row: PipelineCardRow): PipelineCard {
  const events = row.pipeline_events;
  const latest = events.reduce((a, b) => (new Date(a.entered_at) > new Date(b.entered_at) ? a : b));
  return {
    candidateOpeningId: row.id,
    candidateId: row.candidate_id,
    candidateName: row.candidates.name,
    currentStage: row.current_stage,
    latestEnteredAt: latest.entered_at,
    stuck: isStuck(events),
    matchScore: row.match_score,
    matchRationale: row.match_rationale,
  };
}

export async function getPipelineForOpening(openingId: string): Promise<PipelineCard[]> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('id, current_stage, candidate_id, match_score, match_rationale, candidates(name), pipeline_events(stage, entered_at)')
    .eq('opening_id', openingId);
  if (error) throw new Error(`getPipelineForOpening failed: ${error.message}`);
  return (data as unknown as PipelineCardRow[]).map(toPipelineCard);
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

interface CandidateOpeningWithOpeningRow extends CandidateOpening {
  openings: { title: string };
}

export async function getCandidateOpenings(
  candidateId: string
): Promise<(CandidateOpening & { openingTitle: string })[]> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('*, openings(title)')
    .eq('candidate_id', candidateId);
  if (error) throw new Error(`getCandidateOpenings failed: ${error.message}`);
  return (data as CandidateOpeningWithOpeningRow[]).map((row) => ({ ...row, openingTitle: row.openings.title }));
}

export async function getStuckCandidates(): Promise<PipelineCard[]> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('id, current_stage, candidate_id, match_score, match_rationale, candidates(name), pipeline_events(stage, entered_at)')
    .not('current_stage', 'in', '(Joined,Rejected,Dropped)');
  if (error) throw new Error(`getStuckCandidates failed: ${error.message}`);
  return (data as unknown as PipelineCardRow[]).map(toPipelineCard).filter((c) => c.stuck);
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

interface ScoreMatchRow {
  id: string;
  candidates: { resume_summary: string | null };
  openings: { description: string | null };
}

export async function scoreMatch(candidateOpeningId: string): Promise<{ score: number; rationale: string }> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('id, candidates(resume_summary), openings(description)')
    .eq('id', candidateOpeningId)
    .single();
  if (error) throw new Error(`scoreMatch fetch failed: ${error.message}`);

  const row = data as unknown as ScoreMatchRow;
  const resumeSummary = row.candidates.resume_summary;
  const jd = row.openings.description;
  if (!resumeSummary || !jd) {
    throw new Error('scoreMatch requires both a resume summary and a job description');
  }

  const prompt = `You are helping an HR team score how well a candidate fits a role.

Job description:
"""
${jd}
"""

Candidate summary:
"""
${resumeSummary}
"""

Respond with ONLY a JSON object of the exact shape {"score": <integer 0-100>, "rationale": "<one or two sentence explanation>"} and nothing else — no markdown, no code fences.`;

  const raw = await groqChatCompletion(prompt);
  let parsed: { score: number; rationale: string };
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error(`scoreMatch: Groq response was not valid JSON: ${raw}`);
  }
  if (typeof parsed.score !== 'number' || typeof parsed.rationale !== 'string') {
    throw new Error(`scoreMatch: Groq response missing expected fields: ${raw}`);
  }

  const { error: updateError } = await supabase
    .from('candidate_openings')
    .update({ match_score: parsed.score, match_rationale: parsed.rationale })
    .eq('id', candidateOpeningId);
  if (updateError) throw new Error(`scoreMatch update failed: ${updateError.message}`);

  return parsed;
}
