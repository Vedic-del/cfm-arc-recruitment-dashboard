export interface PipelineEventLike {
  stage: string;
  entered_at: string;
}

const STUCK_THRESHOLD_DAYS = 7;

export function daysBetween(start: string | Date, end: string | Date): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return (endMs - startMs) / (1000 * 60 * 60 * 24);
}

export function isStuck(events: PipelineEventLike[], now: Date = new Date()): boolean {
  if (events.length === 0) return false;
  const latest = events.reduce((a, b) => (new Date(a.entered_at) > new Date(b.entered_at) ? a : b));
  return daysBetween(latest.entered_at, now) > STUCK_THRESHOLD_DAYS;
}

export function timeToFill(dateOpened: string, dateFilled: string): number {
  return daysBetween(dateOpened, dateFilled);
}

export function averageTimeInStage(allEvents: PipelineEventLike[][]): Record<string, number> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const events of allEvents) {
    const sorted = [...events].sort(
      (a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const stage = sorted[i].stage;
      const duration = daysBetween(sorted[i].entered_at, sorted[i + 1].entered_at);
      if (!totals[stage]) totals[stage] = { sum: 0, count: 0 };
      totals[stage].sum += duration;
      totals[stage].count += 1;
    }
  }
  const result: Record<string, number> = {};
  for (const [stage, { sum, count }] of Object.entries(totals)) {
    result[stage] = sum / count;
  }
  return result;
}
