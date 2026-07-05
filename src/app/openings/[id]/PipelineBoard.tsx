'use client';

import { useState } from 'react';
import { STAGES, type Stage } from '@/lib/types';
import { advanceStageAction, generateScorecardAction } from './actions';
import type { PipelineCard } from '@/lib/db/pipeline';

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

export function PipelineBoard({ openingId, cards }: { openingId: string; cards: PipelineCard[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleGenerateLink(candidateOpeningId: string, stage: Stage) {
    try {
      const token = await generateScorecardAction(candidateOpeningId, stage);
      setLinks((prev) => ({ ...prev, [candidateOpeningId]: `${window.location.origin}/scorecard/${token}` }));
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: 'Failed to generate link — try again.' }));
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
      {cards.map((card, i) => (
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
              onChange={async (e) => {
                try {
                  await advanceStageAction(card.candidateOpeningId, openingId, e.target.value as Stage);
                  setErrors((prev) => ({ ...prev, [card.candidateOpeningId]: '' }));
                } catch {
                  setErrors((prev) => ({ ...prev, [card.candidateOpeningId]: 'Failed to update stage — try again.' }));
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => handleGenerateLink(card.candidateOpeningId, card.currentStage)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-forest-900 transition-colors hover:bg-slate-100"
            >
              Generate Scorecard Link
            </button>
          </div>
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
      ))}
    </div>
  );
}
