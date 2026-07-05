'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STAGES, type Stage, type Scorecard } from '@/lib/types';
import {
  advanceStageAction,
  generateScorecardAction,
  scoreMatchAction,
  updateNextStepAction,
} from './actions';
import type { PipelineCard } from '@/lib/db/pipeline';
import { Spinner } from '@/components/Spinner';

const PATH: Stage[] = ['Sourced', 'Screening', 'Round 1', 'Round 2', 'HR/Offer Discussion', 'Offer', 'Joined'];

const SMALL_INPUT =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';

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

function scorecardBadgeClasses(score: string | null): string {
  if (score === 'Select') return 'bg-green-100 text-forest-900';
  if (score === 'Hold') return 'bg-amber-100 text-amber-800';
  if (score === 'Reject') return 'bg-danger-bg text-danger';
  return 'bg-slate-100 text-slate';
}

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function NextStepEditor({
  card,
  openingId,
  onError,
}: {
  card: PipelineCard;
  openingId: string;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(card.nextStep ?? '');
  const [date, setDate] = useState(card.nextActionDate ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ step: string | null; date: string | null } | null>(null);

  const currentStep = saved ? saved.step : card.nextStep;
  const currentDate = saved ? saved.date : card.nextActionDate;
  const closed = card.currentStage === 'Joined' || card.currentStage === 'Rejected' || card.currentStage === 'Dropped';

  if (closed) return null;

  async function save() {
    setSaving(true);
    try {
      await updateNextStepAction(card.candidateOpeningId, openingId, step.trim() || null, date || null);
      setSaved({ step: step.trim() || null, date: date || null });
      setEditing(false);
    } catch {
      onError("Couldn't save the next step — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={step}
          onChange={(e) => setStep(e.target.value)}
          placeholder="Next step, e.g. Schedule Round 1"
          className={`${SMALL_INPUT} min-w-[220px] flex-1`}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={SMALL_INPUT} />
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Spinner className="h-3 w-3" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (currentStep || currentDate) {
    const overdue = currentDate ? isOverdue(currentDate) : false;
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            overdue ? 'bg-danger-bg text-danger' : 'bg-slate-100 text-ink'
          }`}
        >
          {overdue ? '⚠ Overdue' : 'Next'}: {currentStep ?? 'Follow up'}
          {currentDate ? ` · ${currentDate}` : ''}
        </span>
        <button onClick={() => setEditing(true)} className="text-xs font-medium text-forest-700 hover:text-forest-900 hover:underline">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button onClick={() => setEditing(true)} className="text-xs font-medium text-forest-700 hover:text-forest-900 hover:underline">
        + Set next step / follow-up date
      </button>
    </div>
  );
}

export function PipelineBoard({
  openingId,
  cards,
  scorecardsByCandidate,
}: {
  openingId: string;
  cards: PipelineCard[];
  scorecardsByCandidate: Record<string, Scorecard[]>;
}) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, { score: number; rationale: string }>>({});
  const [pendingStage, setPendingStage] = useState<Record<string, boolean>>({});
  const [pendingLink, setPendingLink] = useState<Record<string, boolean>>({});
  const [pendingMatch, setPendingMatch] = useState<Record<string, boolean>>({});

  function setError(candidateOpeningId: string, msg: string) {
    setErrors((prev) => ({ ...prev, [candidateOpeningId]: msg }));
  }

  async function handleAdvanceStage(candidateOpeningId: string, candidateId: string, newStage: Stage) {
    let reason: string | undefined;
    if (newStage === 'Rejected' || newStage === 'Dropped') {
      reason =
        prompt(`Why is this candidate being marked ${newStage.toLowerCase()}? (optional — press OK to continue)`) ??
        undefined;
    }
    setPendingStage((prev) => ({ ...prev, [candidateOpeningId]: true }));
    try {
      await advanceStageAction(candidateOpeningId, openingId, candidateId, newStage, reason);
      setError(candidateOpeningId, '');
    } catch {
      setError(candidateOpeningId, 'Failed to update stage — try again.');
    } finally {
      setPendingStage((prev) => ({ ...prev, [candidateOpeningId]: false }));
    }
  }

  async function handleGenerateLink(candidateOpeningId: string, stage: Stage) {
    setPendingLink((prev) => ({ ...prev, [candidateOpeningId]: true }));
    try {
      const token = await generateScorecardAction(candidateOpeningId, stage);
      setLinks((prev) => ({ ...prev, [candidateOpeningId]: `${window.location.origin}/scorecard/${token}` }));
      setError(candidateOpeningId, '');
    } catch {
      setError(candidateOpeningId, 'Failed to generate link — try again.');
    } finally {
      setPendingLink((prev) => ({ ...prev, [candidateOpeningId]: false }));
    }
  }

  async function handleScoreMatch(candidateOpeningId: string, candidateId: string) {
    setPendingMatch((prev) => ({ ...prev, [candidateOpeningId]: true }));
    try {
      const result = await scoreMatchAction(candidateOpeningId, candidateId);
      setScores((prev) => ({ ...prev, [candidateOpeningId]: result }));
      setError(candidateOpeningId, '');
    } catch {
      setError(
        candidateOpeningId,
        'Failed to score match — make sure both a resume summary and a job description exist.'
      );
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
        const scorecards = scorecardsByCandidate[card.candidateOpeningId] ?? [];

        return (
          <div
            key={card.candidateOpeningId}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`animate-fade-in-up rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
              card.stuck ? 'border-danger/30 bg-danger-bg/40' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/candidates/${card.candidateId}`}
                className="font-medium text-ink hover:text-forest-900 hover:underline"
              >
                {card.candidateName}
              </Link>
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
                onChange={(e) => handleAdvanceStage(card.candidateOpeningId, card.candidateId, e.target.value as Stage)}
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {effectiveScore !== null ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${matchBadgeClasses(effectiveScore.score)}`}
                  title={effectiveScore.rationale}
                >
                  Match: {effectiveScore.score}/100
                </span>
              ) : (
                <button
                  onClick={() => handleScoreMatch(card.candidateOpeningId, card.candidateId)}
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
              {scorecards.map((sc) => (
                <span
                  key={sc.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${scorecardBadgeClasses(sc.submitted_at ? sc.score : null)}`}
                  title={sc.comments ?? undefined}
                >
                  {sc.stage}: {sc.submitted_at ? sc.score : 'awaiting feedback'}
                </span>
              ))}
            </div>
            {effectiveScore?.rationale && (
              <p className="mt-1 text-xs text-slate">{effectiveScore.rationale}</p>
            )}
            {card.outcomeReason && (card.currentStage === 'Rejected' || card.currentStage === 'Dropped') && (
              <p className="mt-1 text-xs text-slate">
                Reason: <span className="text-ink">{card.outcomeReason}</span>
              </p>
            )}
            <NextStepEditor card={card} openingId={openingId} onError={(msg) => setError(card.candidateOpeningId, msg)} />
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
