import type { Stage } from '@/lib/types';

/**
 * One source of truth for how each pipeline stage looks across the app.
 * The active path deepens in brand green as a candidate advances — the colour
 * itself encodes progress. Rejected is danger red; Dropped is muted.
 *  - bar:   hex for the funnel bars
 *  - dot:   hex for the small stage dot on board columns
 *  - badge: tailwind classes for a stage pill
 */
export const STAGE_META: Record<Stage, { bar: string; dot: string; badge: string }> = {
  Sourced: { bar: '#86efac', dot: '#86efac', badge: 'bg-green-100 text-forest-900' },
  Screening: { bar: '#4ade80', dot: '#4ade80', badge: 'bg-green-100 text-forest-900' },
  'Round 1': { bar: '#22c55e', dot: '#22c55e', badge: 'bg-green-500/20 text-forest-900' },
  'Round 2': { bar: '#16a34a', dot: '#16a34a', badge: 'bg-green-500/25 text-forest-900' },
  'HR/Offer Discussion': { bar: '#15803d', dot: '#15803d', badge: 'bg-forest-700/15 text-forest-900' },
  Offer: { bar: '#0f4c3a', dot: '#0f4c3a', badge: 'bg-forest-900/15 text-forest-900' },
  Joined: { bar: '#08211a', dot: '#08211a', badge: 'bg-forest-900 text-green-100' },
  Rejected: { bar: '#dc2626', dot: '#dc2626', badge: 'bg-danger-bg text-danger' },
  Dropped: { bar: '#94a3b8', dot: '#94a3b8', badge: 'bg-slate-100 text-slate' },
};
