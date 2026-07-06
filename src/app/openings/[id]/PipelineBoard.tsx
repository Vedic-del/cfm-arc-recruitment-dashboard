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
import { STAGE_META } from '@/lib/stages';

const PATH: Stage[] = ['Sourced', 'Screening', 'Round 1', 'Round 2', 'HR/Offer Discussion', 'Offer', 'Joined'];

const SMALL_INPUT =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';

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

function nextStageOf(stage: Stage): Stage | null {
  const i = PATH.indexOf(stage);
  return i >= 0 && i < PATH.length - 1 ? PATH[i + 1] : null;
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
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <input
          value={step}
          onChange={(e) => setStep(e.target.value)}
          placeholder="Next step…"
          className={`${SMALL_INPUT} min-w-[140px] flex-1`}
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
        + Next step
      </button>
    </div>
  );
}

const COLUMNS: Stage[] = [...STAGES];

export function PipelineBoard({
  openingId,
  cards,
  scorecardsByCandidate,
}: {
  openingId: string;
  cards: PipelineCard[];
  scorecardsByCandidate: Record<string, Scorecard[]>;
}) {
  const [view, setView] = useState<'board' | 'list'>('board');
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

  function renderCard(card: PipelineCard) {
    const effectiveScore =
      scores[card.candidateOpeningId] ??
      (card.matchScore !== null ? { score: card.matchScore, rationale: card.matchRationale ?? '' } : null);
    const scorecards = scorecardsByCandidate[card.candidateOpeningId] ?? [];
    const next = nextStageOf(card.currentStage);
    const busy = pendingStage[card.candidateOpeningId];

    return (
      <div
        key={card.candidateOpeningId}
        className={`animate-fade-in-up rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md ${
          card.stuck ? 'border-danger/30 bg-danger-bg/40' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/candidates/${card.candidateId}`}
            className="font-medium text-ink hover:text-forest-900 hover:underline"
          >
            {card.candidateName}
          </Link>
          {card.stuck && (
            <span className="shrink-0 rounded-full border border-danger/20 bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
              Stuck
            </span>
          )}
        </div>

        {(effectiveScore !== null || scorecards.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {effectiveScore !== null && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${matchBadgeClasses(effectiveScore.score)}`}
                title={effectiveScore.rationale}
              >
                Match {effectiveScore.score}
              </span>
            )}
            {scorecards.map((sc) => (
              <span
                key={sc.id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${scorecardBadgeClasses(sc.submitted_at ? sc.score : null)}`}
                title={sc.comments ?? undefined}
              >
                {sc.stage}: {sc.submitted_at ? sc.score : '…'}
              </span>
            ))}
          </div>
        )}

        {card.outcomeReason && (card.currentStage === 'Rejected' || card.currentStage === 'Dropped') && (
          <p className="mt-1.5 text-xs text-slate">
            Reason: <span className="text-ink">{card.outcomeReason}</span>
          </p>
        )}

        <NextStepEditor card={card} openingId={openingId} onError={(msg) => setError(card.candidateOpeningId, msg)} />

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {next && (
            <button
              onClick={() => handleAdvanceStage(card.candidateOpeningId, card.candidateId, next)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Spinner className="h-3 w-3" /> : '→'} {next}
            </button>
          )}
          <select
            key={card.currentStage}
            value={card.currentStage}
            disabled={busy}
            onChange={(e) => handleAdvanceStage(card.candidateOpeningId, card.candidateId, e.target.value as Stage)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-ink focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition disabled:cursor-not-allowed disabled:opacity-60"
            title="Move to stage"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            onClick={() => handleGenerateLink(card.candidateOpeningId, card.currentStage)}
            disabled={pendingLink[card.candidateOpeningId]}
            className="text-xs font-medium text-forest-700 hover:text-forest-900 hover:underline disabled:opacity-60"
          >
            {pendingLink[card.candidateOpeningId] ? 'Generating…' : 'Scorecard link'}
          </button>
          {effectiveScore === null && (
            <button
              onClick={() => handleScoreMatch(card.candidateOpeningId, card.candidateId)}
              disabled={pendingMatch[card.candidateOpeningId]}
              className="text-xs font-medium text-forest-700 hover:text-forest-900 hover:underline disabled:opacity-60"
            >
              {pendingMatch[card.candidateOpeningId] ? 'Scoring…' : 'Match vs JD'}
            </button>
          )}
        </div>

        {errors[card.candidateOpeningId] && (
          <div className="mt-2 text-xs text-danger">{errors[card.candidateOpeningId]}</div>
        )}
        {links[card.candidateOpeningId] && (
          <div className="animate-fade-in-up mt-2 rounded-lg bg-green-100 p-2 text-xs break-all text-forest-900">
            {links[card.candidateOpeningId]}
          </div>
        )}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">No candidates linked to this opening yet.</p>
      </div>
    );
  }

  const byStage = new Map<Stage, PipelineCard[]>();
  for (const stage of COLUMNS) byStage.set(stage, []);
  for (const card of cards) byStage.get(card.currentStage)?.push(card);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate">
          {cards.length} candidate{cards.length === 1 ? '' : 's'} in this pipeline
        </p>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          <button
            onClick={() => setView('board')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors ${view === 'board' ? 'bg-forest-900 text-white' : 'bg-white text-forest-900 hover:bg-slate-100'}`}
          >
            Board
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors ${view === 'list' ? 'bg-forest-900 text-white' : 'bg-white text-forest-900 hover:bg-slate-100'}`}
          >
            List
          </button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {COLUMNS.map((stage) => {
            const items = byStage.get(stage) ?? [];
            return (
              <div key={stage} className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 p-2">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_META[stage].dot }} />
                    {stage}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate shadow-sm">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-slate/60">No one here</p>
                  ) : (
                    items.map(renderCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(renderCard)}</div>
      )}
    </div>
  );
}
