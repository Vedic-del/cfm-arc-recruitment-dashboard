'use client';

import { useState } from 'react';
import { STAGES, type Stage } from '@/lib/types';
import { advanceStageAction, generateScorecardAction, scoreMatchAction } from './actions';
import type { PipelineCard } from '@/lib/db/pipeline';
import { Spinner } from '@/components/Spinner';

const PATH: Stage[] = ['Sourced', 'Screening', 'Round 1', 'Round 2', 'HR/Offer Discussion', 'Offer', 'Joined'];

function ProgressRail({ stage }: { stage: Stage }) {
  if (stage === 'Rejected' || stage === 'Dropped') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate">
        <span className="h-1.5 w-1.5 rounded-full bg-slate" />
        {stage}
      </span>
    );
  }

  const currentIndex = PATH.indexOf(stage);

  return (
    <div className="flex items-center gap-1" title={stage}>
      {PATH.map((s, i) => {
        const reached = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <span
            key={s}
            className={`h-2 w-2 rounded-full transition-all ${
              reached ? 'bg-green-500' : 'bg-slate-200'
            } ${isCurrent ? 'animate-pulse-glow ring-2 ring-green-400/50' : ''}`}
          />
        );
      })}
    </div>
  );
}

function matchBadgeClasses(score: number): string {
  if (score < 40) return 'bg-danger-bg text-danger';
  if (score < 70) return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-forest-900';
}

export function PipelineBoard({ openingId, cards }: { openingId: string; cards: PipelineCard[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, { score: number; rationale: string }>>({});
  const [pendingStage, setPendingStage] = useState<Record<string, boolean>>({});
  const [pendingLink, setPendingLink] = useState<Record<string, boolean>>({});
  const [pendingMatch, setPendingMatch] = useState<Record<string, boolean>>({});

  async function handleAdvanceStage(candidateOpeningId: string, newStage: Stage) {
    setPendingStage((prev) => ({ ...prev, [candidateOpeningId]: true }));
    try {
      await advanceStageAction(candidateOpeningId, openingId, newStage);
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: 'Failed to update stage — try again.' }));
    } finally {
      setPendingStage((prev) => ({ ...prev, [candidateOpeningId]: false }));
    }
  }

  async function handleGenerateLink(candidateOpeningId: string, stage: Stage) {
    setPendingLink((prev) => ({ ...prev, [candidateOpeningId]: true }));
    try {
      const token = await generateScorecardAction(candidateOpeningId, stage);
      setLinks((prev) => ({ ...prev, [candidateOpeningId]: `${window.location.origin}/scorecard/${token}` }));
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: 'Failed to generate link — try again.' }));
    } finally {
      setPendingLink((prev) => ({ ...prev, [candidateOpeningId]: false }));
    }
  }

  async function handleScoreMatch(candidateOpeningId: string) {
    setPendingMatch((prev) => ({ ...prev, [candidateOpeningId]: true }));
    try {
      const result = await scoreMatchAction(candidateOpeningId);
      setScores((prev) => ({ ...prev, [candidateOpeningId]: result }));
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: '' }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        [candidateOpeningId]: 'Failed to score match — make sure both a resume summary and a job description exist.',
      }));
    } finally {
      setPendingMatch((prev) => ({ ...prev, [candidateOpeningId]: false }));
    }
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">No candidates linked to this opening yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {cards.map((card, i) => {
        const effectiveScore =
          scores[card.candidateOpeningId] ??
          (card.matchScore !== null ? { score: card.matchScore, rationale: card.matchRationale ?? '' } : null);

        return (
          <div
            key={card.candidateOpeningId}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`animate-fade-in-up rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
              card.stuck ? 'border-danger/30 bg-danger-bg/40' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">{card.candidateName}</span>
              <div className="flex items-center gap-2">
                <ProgressRail stage={card.currentStage} />
                {card.stuck && (
                  <span className="rounded-full border border-danger/20 bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                    Stuck
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                key={card.currentStage}
                defaultValue={card.currentStage}
                disabled={pendingStage[card.candidateOpeningId]}
                onChange={(e) => handleAdvanceStage(card.candidateOpeningId, e.target.value as Stage)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {pendingStage[card.candidateOpeningId] && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate">
                  <Spinner className="h-3 w-3" />
                  Updating…
                </span>
              )}
              <button
                onClick={() => handleGenerateLink(card.candidateOpeningId, card.currentStage)}
                disabled={pendingLink[card.candidateOpeningId]}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-forest-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingLink[card.candidateOpeningId] ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner className="h-3 w-3" />
                    Generating…
                  </span>
                ) : (
                  'Generate Scorecard Link'
                )}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {effectiveScore !== null ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${matchBadgeClasses(effectiveScore.score)}`}
                  title={effectiveScore.rationale}
                >
                  Match: {effectiveScore.score}/100
                </span>
              ) : (
                <button
                  onClick={() => handleScoreMatch(card.candidateOpeningId)}
                  disabled={pendingMatch[card.candidateOpeningId]}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-forest-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingMatch[card.candidateOpeningId] ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Spinner className="h-3 w-3" />
                      Scoring…
                    </span>
                  ) : (
                    'Match against JD'
                  )}
                </button>
              )}
            </div>
            {effectiveScore?.rationale && (
              <p className="mt-1 text-xs text-slate">{effectiveScore.rationale}</p>
            )}
            {errors[card.candidateOpeningId] && (
              <div className="mt-2 text-sm text-danger">
                {errors[card.candidateOpeningId]}
              </div>
            )}
            {links[card.candidateOpeningId] && (
              <div className="animate-fade-in-up mt-2 rounded-lg bg-green-100 p-2 text-sm break-all text-forest-900">
                {links[card.candidateOpeningId]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
