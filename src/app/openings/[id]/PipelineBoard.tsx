'use client';

import { useState } from 'react';
import { STAGES, type Stage } from '@/lib/types';
import { advanceStageAction, generateScorecardAction } from './actions';
import type { PipelineCard } from '@/lib/db/pipeline';

export function PipelineBoard({ openingId, cards }: { openingId: string; cards: PipelineCard[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});

  async function handleGenerateLink(candidateOpeningId: string, stage: Stage) {
    const token = await generateScorecardAction(candidateOpeningId, stage);
    setLinks((prev) => ({ ...prev, [candidateOpeningId]: `${window.location.origin}/scorecard/${token}` }));
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {cards.map((card) => (
        <div
          key={card.candidateOpeningId}
          className={`border rounded p-4 ${card.stuck ? 'border-red-500 bg-red-50' : ''}`}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">{card.candidateName}</span>
            <span className="text-sm">
              {card.currentStage}
              {card.stuck ? ' — STUCK' : ''}
            </span>
          </div>
          <div className="flex gap-2 mt-2 items-center">
            <select
              defaultValue={card.currentStage}
              onChange={(e) => advanceStageAction(card.candidateOpeningId, openingId, e.target.value as Stage)}
              className="border p-1 rounded"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => handleGenerateLink(card.candidateOpeningId, card.currentStage)}
              className="bg-gray-200 rounded px-2 py-1 text-sm"
            >
              Generate Scorecard Link
            </button>
          </div>
          {links[card.candidateOpeningId] && (
            <div className="mt-2 text-sm break-all bg-gray-100 p-2 rounded">
              {links[card.candidateOpeningId]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
