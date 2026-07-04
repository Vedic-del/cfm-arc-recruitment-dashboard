import { describe, it, expect } from 'vitest';
import { isStuck, daysBetween, timeToFill, averageTimeInStage } from './pipelineLogic';

describe('isStuck', () => {
  it('returns true when latest stage entered more than 7 days ago', () => {
    const now = new Date('2026-07-04T00:00:00Z');
    const events = [{ stage: 'Round 1', entered_at: '2026-06-20T00:00:00Z' }];
    expect(isStuck(events, now)).toBe(true);
  });

  it('returns false when latest stage entered less than 7 days ago', () => {
    const now = new Date('2026-07-04T00:00:00Z');
    const events = [{ stage: 'Round 1', entered_at: '2026-07-01T00:00:00Z' }];
    expect(isStuck(events, now)).toBe(false);
  });

  it('returns false when there are no events', () => {
    expect(isStuck([], new Date('2026-07-04T00:00:00Z'))).toBe(false);
  });
});

describe('daysBetween', () => {
  it('computes days between two ISO dates', () => {
    expect(daysBetween('2026-07-01T00:00:00Z', '2026-07-04T00:00:00Z')).toBe(3);
  });
});

describe('timeToFill', () => {
  it('computes days between opened and filled dates', () => {
    expect(timeToFill('2026-06-01T00:00:00Z', '2026-06-15T00:00:00Z')).toBe(14);
  });
});

describe('averageTimeInStage', () => {
  it('averages duration per stage across multiple candidate pipelines', () => {
    const allEvents = [
      [
        { stage: 'Sourced', entered_at: '2026-06-01T00:00:00Z' },
        { stage: 'Screening', entered_at: '2026-06-05T00:00:00Z' },
      ],
      [
        { stage: 'Sourced', entered_at: '2026-06-10T00:00:00Z' },
        { stage: 'Screening', entered_at: '2026-06-13T00:00:00Z' },
      ],
    ];
    const result = averageTimeInStage(allEvents);
    expect(result['Sourced']).toBe(3.5);
  });
});
