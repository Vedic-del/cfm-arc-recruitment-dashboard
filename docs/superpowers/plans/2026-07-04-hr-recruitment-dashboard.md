# HR Recruitment Dashboard (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-URL web app that replaces scattered Excel sheets for tracking recruitment openings, candidates, pipeline stages, time-to-fill, and manager interview feedback for CFM Asset Reconstruction Company.

**Architecture:** Next.js (App Router, TypeScript, Tailwind) app deployed on Vercel. Supabase (Postgres + Storage) holds all data and resume files. No authentication — the app is reachable via one open URL, matching the explicit decision in the design spec. Manager feedback is collected via unique per-candidate/round scorecard links, no login required.

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, @supabase/supabase-js, Vitest (pure-logic unit tests), tsx + dotenv (throwaway DB verification scripts), Vercel (hosting), Supabase (Postgres + Storage) — all free tier.

## Global Constraints

- Runtime: Node.js 18+, package manager: npm.
- Framework: Next.js App Router + TypeScript + Tailwind CSS.
- Next.js 15+ dynamic APIs (`params`, `searchParams`) are Promises — always `await` them.
- Database: Supabase Postgres, accessed via the anon key from server code. RLS stays **disabled** on all app tables — this is intentional, matching the spec's explicit "no login, open link" decision, not an oversight.
- File storage: Supabase Storage, public bucket named `resumes`.
- Stuck threshold: 7 days, a constant in code (`STUCK_THRESHOLD_DAYS`) — not user-configurable in Phase 1 (YAGNI; make configurable only if asked later).
- Testing strategy: Vitest unit tests apply **only** to pure logic in `src/lib/pipelineLogic.ts` (no DB, no mocking). Every Supabase-backed data-layer function is verified with a real throwaway script against the actual Supabase project created in Task 2 (`scripts/verify-*.ts`, run via `npx tsx`) — no mocking of `@supabase/supabase-js`. Every UI page is verified by running the dev server and walking through the flow in a browser, per the design spec's testing approach.
- Cost ceiling: $0. Every service (Vercel, Supabase, later Groq) must stay within its free tier.
- Phase 2 (AI resume ranking, JD generation, smart historical resurfacing, access control) is explicitly out of scope for this plan.

## File Structure

```
package.json, tsconfig.json, tailwind.config.ts, vitest.config.ts, .env.local (gitignored), .env.example
supabase/schema.sql                          -- DDL run manually in Supabase SQL editor
scripts/verify-openings.ts                   -- throwaway DB verification (Task 4)
scripts/verify-candidates.ts                 -- throwaway DB verification (Task 5)
scripts/verify-pipeline.ts                   -- throwaway DB verification (Task 6)
scripts/verify-scorecards.ts                 -- throwaway DB verification (Task 7)
src/lib/types.ts                             -- shared TS types/enums (Task 2)
src/lib/supabaseClient.ts                    -- Supabase client singleton (Task 2)
src/lib/pipelineLogic.ts                     -- pure stage-timing math, unit tested (Task 3)
src/lib/pipelineLogic.test.ts                -- Vitest tests for the above (Task 3)
src/lib/db/openings.ts                       -- Openings CRUD + avg-time-to-fill (Task 4)
src/lib/db/candidates.ts                     -- Candidates CRUD + resume upload + search (Task 5)
src/lib/db/pipeline.ts                       -- stage linking/advancing + dashboard aggregates (Task 6)
src/lib/db/scorecards.ts                     -- scorecard generate/fetch/submit (Task 7)
src/app/layout.tsx, globals.css              -- shell + nav (Task 8)
src/app/page.tsx                             -- Dashboard (Task 16)
src/app/openings/new/{page.tsx,actions.ts}   -- Add Opening (Task 9)
src/app/openings/page.tsx                    -- Openings list (Task 10)
src/app/openings/[id]/{page.tsx,actions.ts,PipelineBoard.tsx} -- Opening kanban (Task 11)
src/app/candidates/new/{page.tsx,actions.ts} -- Add Candidate (Task 12)
src/app/candidates/[id]/{page.tsx,actions.ts}-- Candidate profile (Task 13)
src/app/candidates/page.tsx                  -- Historical repository/search (Task 14)
src/app/scorecard/[token]/{page.tsx,actions.ts} -- Public manager scorecard (Task 15)
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` (all via `create-next-app`)
- Create: `.env.local`, `.env.example`

**Interfaces:**
- Produces: a runnable Next.js dev server (`npm run dev`), npm scripts `dev`/`build`/`start`/`lint`, `@supabase/supabase-js`, `vitest`, `tsx`, `dotenv` installed as dependencies.

- [ ] **Step 1: Scaffold the Next.js app**

Run in the project root (`C:\Users\Acer\Downloads\Claude Projects`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

If prompted about anything not covered by these flags, accept the default (press Enter).

- [ ] **Step 2: Verify the dev server runs**

Run: `npm run dev`
Expected: Server starts on `http://localhost:3000`; open it in a browser and confirm the default Next.js welcome page renders. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 3: Install remaining dependencies**

```bash
npm install @supabase/supabase-js
npm install -D vitest tsx dotenv
```

- [ ] **Step 4: Add env files**

Create `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Create `.env.local` (same content, real values added in Task 2 — this file is already gitignored by `create-next-app`'s default `.gitignore`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with Tailwind, Supabase client deps, and test tooling"
```

---

### Task 2: Database schema, shared types, and Supabase project setup

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/lib/types.ts`
- Create: `src/lib/supabaseClient.ts`

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces: `Stage`, `STAGES`, `Priority`, `OpeningStatus`, `Opening`, `Candidate`, `CandidateOpening`, `PipelineEvent`, `Scorecard` types from `src/lib/types.ts`; `supabase` client instance from `src/lib/supabaseClient.ts`; five live tables in the user's Supabase project (`openings`, `candidates`, `candidate_openings`, `pipeline_events`, `scorecards`) and a public Storage bucket `resumes`.

- [ ] **Step 1: Write the schema file**

Create `supabase/schema.sql`:

```sql
-- RLS intentionally left disabled on every table below: this app has no
-- login (explicit design decision), and all access goes through the anon key.

create extension if not exists "pgcrypto";

create table openings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text,
  level text,
  hiring_manager text,
  positions_count int not null default 1,
  date_opened date not null default current_date,
  priority text not null default 'normal' check (priority in ('urgent','normal')),
  status text not null default 'open' check (status in ('open','on_hold','closed','filled')),
  target_close_date date,
  filled_at timestamptz,
  created_at timestamptz not null default now()
);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  location text,
  current_employer text,
  current_designation text,
  years_experience_total numeric,
  years_experience_relevant numeric,
  current_salary numeric,
  expected_salary numeric,
  notice_period text,
  source text,
  resume_path text,
  tags text,
  created_at timestamptz not null default now()
);

create table candidate_openings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id),
  opening_id uuid not null references openings(id),
  current_stage text not null default 'Sourced' check (current_stage in
    ('Sourced','Screening','Round 1','Round 2','HR/Offer Discussion','Offer','Joined','Rejected','Dropped')),
  created_at timestamptz not null default now(),
  unique (candidate_id, opening_id)
);

create table pipeline_events (
  id uuid primary key default gen_random_uuid(),
  candidate_opening_id uuid not null references candidate_openings(id),
  stage text not null,
  entered_at timestamptz not null default now()
);

create table scorecards (
  id uuid primary key default gen_random_uuid(),
  candidate_opening_id uuid not null references candidate_openings(id),
  stage text not null,
  token text not null unique,
  score text,
  comments text,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Ask the user to create the Supabase project and run the schema**

This step requires the project owner (not the implementer) to act:

1. Go to supabase.com, sign up free, create a new project.
2. Open the SQL Editor in the Supabase dashboard, paste the full contents of `supabase/schema.sql`, and run it. Confirm all five tables appear under Table Editor.
3. Go to Storage → New bucket → name it exactly `resumes` → mark it **public** → create.
4. Go to Project Settings → API, copy the **Project URL** and the **anon public key**.
5. Paste those into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Do not proceed to Step 3 until this is done — later steps and every subsequent task's verification script depend on a live, reachable Supabase project.

- [ ] **Step 3: Write shared types**

Create `src/lib/types.ts`:

```typescript
export type Stage =
  | 'Sourced'
  | 'Screening'
  | 'Round 1'
  | 'Round 2'
  | 'HR/Offer Discussion'
  | 'Offer'
  | 'Joined'
  | 'Rejected'
  | 'Dropped';

export const STAGES: Stage[] = [
  'Sourced',
  'Screening',
  'Round 1',
  'Round 2',
  'HR/Offer Discussion',
  'Offer',
  'Joined',
  'Rejected',
  'Dropped',
];

export type Priority = 'urgent' | 'normal';
export type OpeningStatus = 'open' | 'on_hold' | 'closed' | 'filled';

export interface Opening {
  id: string;
  title: string;
  department: string | null;
  level: string | null;
  hiring_manager: string | null;
  positions_count: number;
  date_opened: string;
  priority: Priority;
  status: OpeningStatus;
  target_close_date: string | null;
  filled_at: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  current_employer: string | null;
  current_designation: string | null;
  years_experience_total: number | null;
  years_experience_relevant: number | null;
  current_salary: number | null;
  expected_salary: number | null;
  notice_period: string | null;
  source: string | null;
  resume_path: string | null;
  tags: string | null;
  created_at: string;
}

export interface CandidateOpening {
  id: string;
  candidate_id: string;
  opening_id: string;
  current_stage: Stage;
  created_at: string;
}

export interface PipelineEvent {
  id: string;
  candidate_opening_id: string;
  stage: Stage;
  entered_at: string;
}

export interface Scorecard {
  id: string;
  candidate_opening_id: string;
  stage: Stage;
  token: string;
  score: string | null;
  comments: string | null;
  submitted_at: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Write the Supabase client**

Create `src/lib/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql src/lib/types.ts src/lib/supabaseClient.ts .env.example
git commit -m "Add database schema, shared types, and Supabase client"
```

(`.env.local` stays untracked, as intended.)

---

### Task 3: Pure pipeline-timing logic (unit tested)

**Files:**
- Create: `src/lib/pipelineLogic.ts`
- Create: `src/lib/pipelineLogic.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `"test": "vitest run"` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `isStuck(events, now?)`, `daysBetween(start, end)`, `timeToFill(dateOpened, dateFilled)`, `averageTimeInStage(allEvents)` — consumed by `src/lib/db/openings.ts` (Task 4) and `src/lib/db/pipeline.ts` (Task 6).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/pipelineLogic.test.ts`:

```typescript
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
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

Add to `package.json` `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './pipelineLogic'` (file doesn't exist yet).

- [ ] **Step 3: Implement the logic**

Create `src/lib/pipelineLogic.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipelineLogic.ts src/lib/pipelineLogic.test.ts vitest.config.ts package.json
git commit -m "Add pure pipeline-timing logic with unit tests"
```

---

### Task 4: Openings data layer

**Files:**
- Create: `src/lib/db/openings.ts`
- Create: `scripts/verify-openings.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `Opening`, `OpeningStatus` (Task 2), `timeToFill` (Task 3).
- Produces: `createOpening(input)`, `listOpenings()`, `getOpening(id)`, `updateOpeningStatus(id, status)`, `averageTimeToFill()` — consumed by Tasks 9, 10, 11, 12, 13, 16.

- [ ] **Step 1: Implement the data layer**

Create `src/lib/db/openings.ts`:

```typescript
import { supabase } from '@/lib/supabaseClient';
import type { Opening, OpeningStatus, Priority } from '@/lib/types';
import { timeToFill } from '@/lib/pipelineLogic';

export interface CreateOpeningInput {
  title: string;
  department?: string;
  level?: string;
  hiring_manager?: string;
  positions_count?: number;
  date_opened?: string;
  priority?: Priority;
  target_close_date?: string;
}

export async function createOpening(input: CreateOpeningInput): Promise<Opening> {
  const { data, error } = await supabase.from('openings').insert(input).select().single();
  if (error) throw new Error(`createOpening failed: ${error.message}`);
  return data as Opening;
}

export async function listOpenings(): Promise<Opening[]> {
  const { data, error } = await supabase
    .from('openings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listOpenings failed: ${error.message}`);
  return data as Opening[];
}

export async function getOpening(id: string): Promise<Opening | null> {
  const { data, error } = await supabase.from('openings').select('*').eq('id', id).single();
  if (error) return null;
  return data as Opening;
}

export async function updateOpeningStatus(id: string, status: OpeningStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'filled') patch.filled_at = new Date().toISOString();
  const { error } = await supabase.from('openings').update(patch).eq('id', id);
  if (error) throw new Error(`updateOpeningStatus failed: ${error.message}`);
}

export async function averageTimeToFill(): Promise<number | null> {
  const { data, error } = await supabase
    .from('openings')
    .select('date_opened, filled_at')
    .not('filled_at', 'is', null);
  if (error) throw new Error(`averageTimeToFill failed: ${error.message}`);
  const rows = data as { date_opened: string; filled_at: string }[];
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + timeToFill(r.date_opened, r.filled_at), 0);
  return total / rows.length;
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-openings.ts`:

```typescript
// Load environment variables FIRST before any imports. Note: dotenv.config()
// must run before the data-layer module is imported, not just textually
// above it — a static `import ... from '../src/lib/db/openings'` at the top
// of this file would be hoisted and evaluated (along with supabaseClient.ts's
// top-level process.env read) before dotenv.config() runs, since ES module
// imports execute before the importing module's own statements regardless of
// source order. The dynamic import inside main() below sequences it correctly.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening, listOpenings, getOpening, updateOpeningStatus, averageTimeToFill } = await import('../src/lib/db/openings');

  const opening = await createOpening({ title: 'Verification Test Role', department: 'QA' });
  console.log('Created:', opening.id);

  const fetched = await getOpening(opening.id);
  console.log('Fetched title matches:', fetched?.title === 'Verification Test Role');

  const all = await listOpenings();
  console.log('Appears in list:', all.some((o) => o.id === opening.id));

  await updateOpeningStatus(opening.id, 'filled');
  const filled = await getOpening(opening.id);
  console.log('Marked filled, filled_at set:', filled?.filled_at !== null);

  const avg = await averageTimeToFill();
  console.log('Average time to fill (days):', avg);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-openings.ts`
Expected: All console lines print `true` (or a numeric average), no errors. Confirm in the Supabase Table Editor that the "Verification Test Role" row exists with `status = filled` and `filled_at` set.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/openings.ts scripts/verify-openings.ts
git commit -m "Add openings data layer with time-to-fill aggregate"
```

---

### Task 5: Candidates data layer

**Files:**
- Create: `src/lib/db/candidates.ts`
- Create: `scripts/verify-candidates.ts`

**Interfaces:**
- Consumes: `supabase`, `Candidate` (Task 2).
- Produces: `createCandidate(input)`, `uploadResume(candidateId, file)`, `getResumeUrl(resumePath)`, `getCandidate(id)`, `listCandidates(filters?)` — consumed by Tasks 12, 13, 14.

- [ ] **Step 1: Implement the data layer**

Create `src/lib/db/candidates.ts`:

```typescript
import { supabase } from '@/lib/supabaseClient';
import type { Candidate } from '@/lib/types';

export interface CreateCandidateInput {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  current_employer?: string;
  current_designation?: string;
  years_experience_total?: number;
  years_experience_relevant?: number;
  current_salary?: number;
  expected_salary?: number;
  notice_period?: string;
  source?: string;
  tags?: string;
}

export async function createCandidate(input: CreateCandidateInput): Promise<Candidate> {
  const { data, error } = await supabase.from('candidates').insert(input).select().single();
  if (error) throw new Error(`createCandidate failed: ${error.message}`);
  return data as Candidate;
}

export async function uploadResume(candidateId: string, file: File): Promise<string> {
  const path = `${candidateId}/${file.name}`;
  const { error } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
  if (error) throw new Error(`uploadResume failed: ${error.message}`);
  const { error: updateError } = await supabase
    .from('candidates')
    .update({ resume_path: path })
    .eq('id', candidateId);
  if (updateError) throw new Error(`uploadResume update failed: ${updateError.message}`);
  return path;
}

export function getResumeUrl(resumePath: string): string {
  const { data } = supabase.storage.from('resumes').getPublicUrl(resumePath);
  return data.publicUrl;
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const { data, error } = await supabase.from('candidates').select('*').eq('id', id).single();
  if (error) return null;
  return data as Candidate;
}

export interface CandidateFilters {
  query?: string;
  minExperience?: number;
  maxSalary?: number;
  source?: string;
}

export async function listCandidates(filters: CandidateFilters = {}): Promise<Candidate[]> {
  let q = supabase.from('candidates').select('*').order('created_at', { ascending: false });
  if (filters.query) {
    q = q.or(
      `name.ilike.%${filters.query}%,tags.ilike.%${filters.query}%,source.ilike.%${filters.query}%`
    );
  }
  if (filters.minExperience !== undefined) {
    q = q.gte('years_experience_total', filters.minExperience);
  }
  if (filters.maxSalary !== undefined) {
    q = q.lte('expected_salary', filters.maxSalary);
  }
  if (filters.source) {
    q = q.eq('source', filters.source);
  }
  const { data, error } = await q;
  if (error) throw new Error(`listCandidates failed: ${error.message}`);
  return data as Candidate[];
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-candidates.ts`:

```typescript
// dotenv.config() must run before the data-layer module is imported, not just
// textually above it — see the note in scripts/verify-openings.ts (Task 4)
// for why a static top-level import would silently break this.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createCandidate, getCandidate, listCandidates } = await import('../src/lib/db/candidates');

  const candidate = await createCandidate({
    name: 'Verification Test Candidate',
    years_experience_total: 5,
    expected_salary: 1200000,
    source: 'referral',
    tags: 'verification',
  });
  console.log('Created:', candidate.id);

  const fetched = await getCandidate(candidate.id);
  console.log('Fetched name matches:', fetched?.name === 'Verification Test Candidate');

  const filtered = await listCandidates({ minExperience: 3, query: 'Verification' });
  console.log('Appears in filtered list:', filtered.some((c) => c.id === candidate.id));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-candidates.ts`
Expected: Both boolean lines print `true`. Confirm the row exists in the Supabase Table Editor.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/candidates.ts scripts/verify-candidates.ts
git commit -m "Add candidates data layer with resume upload and search"
```

---

### Task 6: Pipeline data layer

**Files:**
- Create: `src/lib/db/pipeline.ts`
- Create: `scripts/verify-pipeline.ts`

**Interfaces:**
- Consumes: `supabase`, `CandidateOpening`, `PipelineEvent`, `Stage` (Task 2), `isStuck`, `averageTimeInStage` (Task 3), an existing candidate id and opening id (created via Tasks 4/5 for verification).
- Produces: `linkCandidateToOpening(candidateId, openingId)`, `advanceStage(candidateOpeningId, newStage)`, `PipelineCard` type, `getPipelineForOpening(openingId)`, `getPipelineHistory(candidateOpeningId)`, `getCandidateOpenings(candidateId)`, `getStuckCandidates()`, `getStageCounts()`, `getAverageTimeInStage()` — consumed by Tasks 11, 12, 13, 16.

- [ ] **Step 1: Implement the data layer**

Create `src/lib/db/pipeline.ts`:

```typescript
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
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-pipeline.ts`:

```typescript
// dotenv.config() must run before the data-layer modules are imported, not
// just textually above it — see the note in scripts/verify-openings.ts
// (Task 4) for why a static top-level import would silently break this.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening } = await import('../src/lib/db/openings');
  const { createCandidate } = await import('../src/lib/db/candidates');
  const {
    linkCandidateToOpening,
    advanceStage,
    getPipelineForOpening,
    getPipelineHistory,
    getCandidateOpenings,
    getStuckCandidates,
    getStageCounts,
  } = await import('../src/lib/db/pipeline');

  const opening = await createOpening({ title: 'Pipeline Verification Role' });
  const candidate = await createCandidate({ name: 'Pipeline Verification Candidate' });

  const co = await linkCandidateToOpening(candidate.id, opening.id);
  console.log('Linked candidate_opening:', co.id);

  await advanceStage(co.id, 'Screening');

  const cards = await getPipelineForOpening(opening.id);
  console.log('Pipeline shows current stage Screening:', cards[0]?.currentStage === 'Screening');

  const history = await getPipelineHistory(co.id);
  console.log('History has 2 events (Sourced, Screening):', history.length === 2);

  const candidateOpenings = await getCandidateOpenings(candidate.id);
  console.log('Candidate has 1 linked opening:', candidateOpenings.length === 1);

  const stageCounts = await getStageCounts();
  console.log('Stage counts includes Screening:', (stageCounts['Screening'] ?? 0) > 0);

  const stuck = await getStuckCandidates();
  console.log('Stuck list is an array:', Array.isArray(stuck));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-pipeline.ts`
Expected: All boolean lines print `true`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/pipeline.ts scripts/verify-pipeline.ts
git commit -m "Add pipeline data layer with stage tracking and dashboard aggregates"
```

---

### Task 7: Scorecards data layer

**Files:**
- Create: `src/lib/db/scorecards.ts`
- Create: `scripts/verify-scorecards.ts`

**Interfaces:**
- Consumes: `supabase`, `Scorecard`, `Stage` (Task 2), an existing `candidate_opening_id` (from Task 6 flow, for verification).
- Produces: `generateScorecard(candidateOpeningId, stage)`, `ScorecardWithContext` type, `getScorecardByToken(token)`, `submitScorecard(token, score, comments)`, `getScorecardsForCandidateOpening(candidateOpeningId)` — consumed by Tasks 11, 13, 15.

- [ ] **Step 1: Implement the data layer**

Create `src/lib/db/scorecards.ts`:

```typescript
import { supabase } from '@/lib/supabaseClient';
import type { Scorecard, Stage } from '@/lib/types';

export async function generateScorecard(candidateOpeningId: string, stage: Stage): Promise<string> {
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from('scorecards')
    .insert({ candidate_opening_id: candidateOpeningId, stage, token });
  if (error) throw new Error(`generateScorecard failed: ${error.message}`);
  return token;
}

export interface ScorecardWithContext extends Scorecard {
  candidateName: string;
  openingTitle: string;
}

export async function getScorecardByToken(token: string): Promise<ScorecardWithContext | null> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*, candidate_openings(candidates(name), openings(title))')
    .eq('token', token)
    .single();
  if (error) return null;
  const row = data as any;
  return {
    ...row,
    candidateName: row.candidate_openings.candidates.name,
    openingTitle: row.candidate_openings.openings.title,
  };
}

export async function submitScorecard(token: string, score: string, comments: string): Promise<void> {
  const { error } = await supabase
    .from('scorecards')
    .update({ score, comments, submitted_at: new Date().toISOString() })
    .eq('token', token);
  if (error) throw new Error(`submitScorecard failed: ${error.message}`);
}

export async function getScorecardsForCandidateOpening(
  candidateOpeningId: string
): Promise<Scorecard[]> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('candidate_opening_id', candidateOpeningId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getScorecardsForCandidateOpening failed: ${error.message}`);
  return data as Scorecard[];
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-scorecards.ts`:

```typescript
// dotenv.config() must run before the data-layer modules are imported, not
// just textually above it — see the note in scripts/verify-openings.ts
// (Task 4) for why a static top-level import would silently break this.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening } = await import('../src/lib/db/openings');
  const { createCandidate } = await import('../src/lib/db/candidates');
  const { linkCandidateToOpening } = await import('../src/lib/db/pipeline');
  const {
    generateScorecard,
    getScorecardByToken,
    submitScorecard,
    getScorecardsForCandidateOpening,
  } = await import('../src/lib/db/scorecards');

  const opening = await createOpening({ title: 'Scorecard Verification Role' });
  const candidate = await createCandidate({ name: 'Scorecard Verification Candidate' });
  const co = await linkCandidateToOpening(candidate.id, opening.id);

  const token = await generateScorecard(co.id, 'Round 1');
  console.log('Generated token:', token);

  const before = await getScorecardByToken(token);
  console.log('Fetched before submit, candidate name matches:', before?.candidateName === candidate.name);
  console.log('Not yet submitted:', before?.submitted_at === null);

  await submitScorecard(token, 'Select', 'Strong candidate');

  const after = await getScorecardByToken(token);
  console.log('Submitted score recorded:', after?.score === 'Select');

  const list = await getScorecardsForCandidateOpening(co.id);
  console.log('Scorecard appears in candidate_opening list:', list.length === 1);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-scorecards.ts`
Expected: All boolean lines print `true`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/scorecards.ts scripts/verify-scorecards.ts
git commit -m "Add scorecards data layer for manager feedback links"
```

---

### Task 8: App shell and navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css` (leave Tailwind defaults from create-next-app as-is)

**Interfaces:**
- Consumes: nothing.
- Produces: shared nav layout wrapping every route (`/`, `/openings`, `/candidates`).

- [ ] **Step 1: Implement the layout**

Replace `src/app/layout.tsx`:

```tsx
import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CFM ARC Recruitment Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-white border-b px-6 py-4 flex gap-6">
          <Link href="/" className="font-semibold">Dashboard</Link>
          <Link href="/openings">Openings</Link>
          <Link href="/candidates">Candidates</Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: Nav bar with "Dashboard", "Openings", "Candidates" links renders on every page. Clicking "Openings"/"Candidates" 404s for now — expected, since those routes don't exist until later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Add app shell with navigation"
```

---

### Task 9: Add Opening page

**Files:**
- Create: `src/app/openings/new/page.tsx`
- Create: `src/app/openings/new/actions.ts`

**Interfaces:**
- Consumes: `createOpening` (Task 4).
- Produces: working `/openings/new` route; redirects to `/openings/[id]` (Task 11) on success.

- [ ] **Step 1: Implement the server action**

Create `src/app/openings/new/actions.ts`:

```typescript
'use server';

import { createOpening } from '@/lib/db/openings';
import { redirect } from 'next/navigation';
import type { Priority } from '@/lib/types';

export async function createOpeningAction(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  if (!title.trim()) throw new Error('Title is required');
  const opening = await createOpening({
    title,
    department: String(formData.get('department') ?? '') || undefined,
    level: String(formData.get('level') ?? '') || undefined,
    hiring_manager: String(formData.get('hiring_manager') ?? '') || undefined,
    positions_count: Number(formData.get('positions_count') ?? 1),
    date_opened: String(formData.get('date_opened') ?? '') || undefined,
    priority: (formData.get('priority') as Priority) ?? 'normal',
    target_close_date: String(formData.get('target_close_date') ?? '') || undefined,
  });
  redirect(`/openings/${opening.id}`);
}
```

- [ ] **Step 2: Implement the page**

Create `src/app/openings/new/page.tsx`:

```tsx
import { createOpeningAction } from './actions';

export default function NewOpeningPage() {
  return (
    <form action={createOpeningAction} className="max-w-lg flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Add Opening</h1>
      <input name="title" placeholder="Role title" required className="border p-2 rounded" />
      <input name="department" placeholder="Department" className="border p-2 rounded" />
      <input name="level" placeholder="Level/Grade" className="border p-2 rounded" />
      <input name="hiring_manager" placeholder="Hiring manager" className="border p-2 rounded" />
      <input name="positions_count" type="number" defaultValue={1} min={1} className="border p-2 rounded" />
      <input name="date_opened" type="date" className="border p-2 rounded" />
      <select name="priority" defaultValue="normal" className="border p-2 rounded">
        <option value="normal">Normal</option>
        <option value="urgent">Urgent</option>
      </select>
      <input name="target_close_date" type="date" className="border p-2 rounded" />
      <button type="submit" className="bg-blue-600 text-white rounded p-2">Create Opening</button>
    </form>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Run `npm run dev`, open `http://localhost:3000/openings/new`, fill in a title, submit.
Expected: Redirects to `/openings/<id>` (will 404 until Task 11 exists — confirm the URL contains a UUID and the row exists in Supabase Table Editor).

- [ ] **Step 4: Commit**

```bash
git add src/app/openings/new
git commit -m "Add Add Opening page"
```

---

### Task 10: Openings list page

**Files:**
- Create: `src/app/openings/page.tsx`

**Interfaces:**
- Consumes: `listOpenings` (Task 4).
- Produces: working `/openings` route linking to `/openings/new` (Task 9) and `/openings/[id]` (Task 11).

- [ ] **Step 1: Implement the page**

Create `src/app/openings/page.tsx`:

```tsx
import Link from 'next/link';
import { listOpenings } from '@/lib/db/openings';

export default async function OpeningsPage() {
  const openings = await listOpenings();
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Openings</h1>
        <Link href="/openings/new" className="bg-blue-600 text-white rounded px-4 py-2">Add Opening</Link>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Title</th>
            <th className="p-2">Department</th>
            <th className="p-2">Status</th>
            <th className="p-2">Priority</th>
            <th className="p-2">Opened</th>
          </tr>
        </thead>
        <tbody>
          {openings.map((o) => (
            <tr key={o.id} className="border-b hover:bg-gray-100">
              <td className="p-2"><Link href={`/openings/${o.id}`}>{o.title}</Link></td>
              <td className="p-2">{o.department}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2">{o.priority}</td>
              <td className="p-2">{o.date_opened}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Open `http://localhost:3000/openings`.
Expected: Table lists openings created so far (including verification/test rows from earlier tasks), each title links out.

- [ ] **Step 3: Commit**

```bash
git add src/app/openings/page.tsx
git commit -m "Add Openings list page"
```

---

### Task 11: Opening detail / pipeline kanban page

**Files:**
- Create: `src/app/openings/[id]/page.tsx`
- Create: `src/app/openings/[id]/actions.ts`
- Create: `src/app/openings/[id]/PipelineBoard.tsx`

**Interfaces:**
- Consumes: `getOpening`, `updateOpeningStatus` (Task 4), `getPipelineForOpening`, `advanceStage`, `PipelineCard` (Task 6), `generateScorecard` (Task 7), `STAGES`, `Stage` (Task 2).
- Produces: working `/openings/[id]` route; links out to `/candidates/new?openingId=` (Task 12).

- [ ] **Step 1: Implement server actions**

Create `src/app/openings/[id]/actions.ts`:

```typescript
'use server';

import { advanceStage } from '@/lib/db/pipeline';
import { generateScorecard } from '@/lib/db/scorecards';
import { updateOpeningStatus } from '@/lib/db/openings';
import { revalidatePath } from 'next/cache';
import type { Stage } from '@/lib/types';

export async function advanceStageAction(candidateOpeningId: string, openingId: string, newStage: Stage) {
  await advanceStage(candidateOpeningId, newStage);
  revalidatePath(`/openings/${openingId}`);
}

export async function generateScorecardAction(candidateOpeningId: string, stage: Stage): Promise<string> {
  return generateScorecard(candidateOpeningId, stage);
}

export async function markOpeningFilledAction(openingId: string) {
  await updateOpeningStatus(openingId, 'filled');
  revalidatePath(`/openings/${openingId}`);
}
```

- [ ] **Step 2: Implement the client-side pipeline board**

Create `src/app/openings/[id]/PipelineBoard.tsx`:

```tsx
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
```

- [ ] **Step 3: Implement the page**

Create `src/app/openings/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { getOpening } from '@/lib/db/openings';
import { getPipelineForOpening } from '@/lib/db/pipeline';
import { PipelineBoard } from './PipelineBoard';
import { markOpeningFilledAction } from './actions';

export default async function OpeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = await getOpening(id);
  if (!opening) return <div>Opening not found</div>;
  const cards = await getPipelineForOpening(id);
  const boundMarkFilled = markOpeningFilledAction.bind(null, opening.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-semibold">{opening.title}</h1>
          <p className="text-sm text-gray-600">
            {opening.department} · {opening.status} · Opened {opening.date_opened}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/candidates/new?openingId=${opening.id}`}
            className="bg-blue-600 text-white rounded px-4 py-2"
          >
            Add Candidate
          </Link>
          <form action={boundMarkFilled}>
            <button type="submit" className="bg-green-600 text-white rounded px-4 py-2">Mark Filled</button>
          </form>
        </div>
      </div>
      <PipelineBoard openingId={opening.id} cards={cards} />
    </div>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Open an opening created earlier (from Task 9's flow) at `/openings/<id>`.
Expected: page loads, shows opening header; after adding a candidate (once Task 12 exists) the pipeline board shows a card; changing the stage dropdown moves the candidate and re-renders; "Generate Scorecard Link" shows a link; "Mark Filled" changes status.

- [ ] **Step 5: Commit**

```bash
git add src/app/openings/[id]
git commit -m "Add opening detail page with pipeline kanban board"
```

---

### Task 12: Add Candidate page

**Files:**
- Create: `src/app/candidates/new/page.tsx`
- Create: `src/app/candidates/new/actions.ts`

**Interfaces:**
- Consumes: `listOpenings` (Task 4), `createCandidate`, `uploadResume` (Task 5), `linkCandidateToOpening` (Task 6).
- Produces: working `/candidates/new` route; redirects to `/candidates/[id]` (Task 13) on success.

- [ ] **Step 1: Implement the server action**

Create `src/app/candidates/new/actions.ts`:

```typescript
'use server';

import { createCandidate, uploadResume } from '@/lib/db/candidates';
import { linkCandidateToOpening } from '@/lib/db/pipeline';
import { redirect } from 'next/navigation';

export async function createCandidateAction(formData: FormData) {
  const name = String(formData.get('name') ?? '');
  if (!name.trim()) throw new Error('Name is required');
  const openingId = String(formData.get('opening_id') ?? '');
  if (!openingId) throw new Error('An opening must be selected');

  const candidate = await createCandidate({
    name,
    phone: String(formData.get('phone') ?? '') || undefined,
    email: String(formData.get('email') ?? '') || undefined,
    location: String(formData.get('location') ?? '') || undefined,
    current_employer: String(formData.get('current_employer') ?? '') || undefined,
    current_designation: String(formData.get('current_designation') ?? '') || undefined,
    years_experience_total: formData.get('years_experience_total')
      ? Number(formData.get('years_experience_total'))
      : undefined,
    years_experience_relevant: formData.get('years_experience_relevant')
      ? Number(formData.get('years_experience_relevant'))
      : undefined,
    current_salary: formData.get('current_salary') ? Number(formData.get('current_salary')) : undefined,
    expected_salary: formData.get('expected_salary')
      ? Number(formData.get('expected_salary'))
      : undefined,
    notice_period: String(formData.get('notice_period') ?? '') || undefined,
    source: String(formData.get('source') ?? '') || undefined,
    tags: String(formData.get('tags') ?? '') || undefined,
  });

  const resumeFile = formData.get('resume') as File | null;
  if (resumeFile && resumeFile.size > 0) {
    await uploadResume(candidate.id, resumeFile);
  }

  await linkCandidateToOpening(candidate.id, openingId);
  redirect(`/candidates/${candidate.id}`);
}
```

- [ ] **Step 2: Implement the page**

Create `src/app/candidates/new/page.tsx`:

```tsx
import { listOpenings } from '@/lib/db/openings';
import { createCandidateAction } from './actions';

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ openingId?: string }>;
}) {
  const { openingId } = await searchParams;
  const openings = await listOpenings();
  return (
    <form action={createCandidateAction} encType="multipart/form-data" className="max-w-lg flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Add Candidate</h1>
      <select name="opening_id" defaultValue={openingId ?? ''} required className="border p-2 rounded">
        <option value="" disabled>Select opening</option>
        {openings.map((o) => (
          <option key={o.id} value={o.id}>{o.title}</option>
        ))}
      </select>
      <input name="name" placeholder="Full name" required className="border p-2 rounded" />
      <input name="phone" placeholder="Phone" className="border p-2 rounded" />
      <input name="email" placeholder="Email" className="border p-2 rounded" />
      <input name="location" placeholder="Location" className="border p-2 rounded" />
      <input name="current_employer" placeholder="Current employer" className="border p-2 rounded" />
      <input name="current_designation" placeholder="Current designation" className="border p-2 rounded" />
      <input name="years_experience_total" type="number" step="0.5" placeholder="Years experience (total)" className="border p-2 rounded" />
      <input name="years_experience_relevant" type="number" step="0.5" placeholder="Years experience (relevant)" className="border p-2 rounded" />
      <input name="current_salary" type="number" placeholder="Current salary (CTC)" className="border p-2 rounded" />
      <input name="expected_salary" type="number" placeholder="Expected salary" className="border p-2 rounded" />
      <input name="notice_period" placeholder="Notice period" className="border p-2 rounded" />
      <input name="source" placeholder="Source (referral, portal, etc.)" className="border p-2 rounded" />
      <input name="tags" placeholder="Tags/notes" className="border p-2 rounded" />
      <input name="resume" type="file" accept=".pdf,.doc,.docx" className="border p-2 rounded" />
      <button type="submit" className="bg-blue-600 text-white rounded p-2">Add Candidate</button>
    </form>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Open `/candidates/new?openingId=<an opening id>`, confirm that opening is preselected; fill the form including a PDF resume, submit.
Expected: Redirects to `/candidates/<id>` (404 until Task 13 — confirm row + resume path exist in Supabase, and the file appears in the `resumes` Storage bucket).

- [ ] **Step 4: Commit**

```bash
git add src/app/candidates/new
git commit -m "Add Add Candidate page with resume upload"
```

---

### Task 13: Candidate profile page

**Files:**
- Create: `src/app/candidates/[id]/page.tsx`
- Create: `src/app/candidates/[id]/actions.ts`

**Interfaces:**
- Consumes: `getCandidate`, `getResumeUrl` (Task 5), `getCandidateOpenings`, `getPipelineHistory`, `linkCandidateToOpening` (Task 6), `getScorecardsForCandidateOpening` (Task 7), `listOpenings` (Task 4).
- Produces: working `/candidates/[id]` route.

- [ ] **Step 1: Implement the server action**

Create `src/app/candidates/[id]/actions.ts`:

```typescript
'use server';

import { linkCandidateToOpening } from '@/lib/db/pipeline';
import { revalidatePath } from 'next/cache';

export async function linkToOpeningAction(candidateId: string, formData: FormData) {
  const openingId = String(formData.get('opening_id') ?? '');
  if (!openingId) throw new Error('An opening must be selected');
  await linkCandidateToOpening(candidateId, openingId);
  revalidatePath(`/candidates/${candidateId}`);
}
```

- [ ] **Step 2: Implement the page**

Create `src/app/candidates/[id]/page.tsx`:

```tsx
import { getCandidate, getResumeUrl } from '@/lib/db/candidates';
import { getCandidateOpenings, getPipelineHistory, getScorecardsForCandidateOpening } from '@/lib/db/pipeline';
import { listOpenings } from '@/lib/db/openings';
import { linkToOpeningAction } from './actions';

export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) return <div>Candidate not found</div>;

  const candidateOpenings = await getCandidateOpenings(id);
  const openings = await listOpenings();
  const boundAction = linkToOpeningAction.bind(null, candidate.id);

  const pipelineDetails = await Promise.all(
    candidateOpenings.map(async (co) => ({
      co,
      history: await getPipelineHistory(co.id),
      scorecards: await getScorecardsForCandidateOpening(co.id),
    }))
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">{candidate.name}</h1>
      <p className="text-sm text-gray-600">{candidate.current_designation} at {candidate.current_employer}</p>
      <dl className="grid grid-cols-2 gap-2 mt-4 text-sm">
        <dt className="font-medium">Phone</dt><dd>{candidate.phone}</dd>
        <dt className="font-medium">Email</dt><dd>{candidate.email}</dd>
        <dt className="font-medium">Location</dt><dd>{candidate.location}</dd>
        <dt className="font-medium">Experience (total)</dt><dd>{candidate.years_experience_total}</dd>
        <dt className="font-medium">Experience (relevant)</dt><dd>{candidate.years_experience_relevant}</dd>
        <dt className="font-medium">Current salary</dt><dd>{candidate.current_salary}</dd>
        <dt className="font-medium">Expected salary</dt><dd>{candidate.expected_salary}</dd>
        <dt className="font-medium">Notice period</dt><dd>{candidate.notice_period}</dd>
        <dt className="font-medium">Source</dt><dd>{candidate.source}</dd>
        <dt className="font-medium">Tags</dt><dd>{candidate.tags}</dd>
      </dl>
      {candidate.resume_path && (
        <a href={getResumeUrl(candidate.resume_path)} target="_blank" className="text-blue-600 underline block mt-2">
          View resume
        </a>
      )}

      <h2 className="text-lg font-semibold mt-6">Pipeline history</h2>
      {pipelineDetails.map(({ co, history, scorecards }) => (
        <div key={co.id} className="border rounded p-3 mt-2">
          <p className="font-medium">{co.openingTitle} — {co.current_stage}</p>
          <ul className="text-sm list-disc pl-5">
            {history.map((h) => (
              <li key={h.id}>{h.stage} — {new Date(h.entered_at).toLocaleDateString()}</li>
            ))}
          </ul>
          {scorecards.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="font-medium">Scorecards</p>
              <ul className="list-disc pl-5">
                {scorecards.map((s) => (
                  <li key={s.id}>
                    {s.stage}: {s.submitted_at ? `${s.score} — ${s.comments}` : 'pending'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <h2 className="text-lg font-semibold mt-6">Link to another opening</h2>
      <form action={boundAction} className="flex gap-2 mt-2">
        <select name="opening_id" required defaultValue="" className="border p-2 rounded">
          <option value="" disabled>Select opening</option>
          {openings.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2">Link</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Open `/candidates/<id>` for the candidate created in Task 12.
Expected: All fields display, resume link opens the uploaded PDF, pipeline history shows "Sourced" entry, "Link to another opening" form creates a second `candidate_openings` row when submitted (confirm two entries in Table Editor).

- [ ] **Step 4: Commit**

```bash
git add src/app/candidates/[id]
git commit -m "Add candidate profile page with pipeline history and re-linking"
```

---

### Task 14: Historical repository / search page

**Files:**
- Create: `src/app/candidates/page.tsx`

**Interfaces:**
- Consumes: `listCandidates` (Task 5).
- Produces: working `/candidates` route.

- [ ] **Step 1: Implement the page**

Create `src/app/candidates/page.tsx`:

```tsx
import Link from 'next/link';
import { listCandidates } from '@/lib/db/candidates';

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; minExperience?: string; maxSalary?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const candidates = await listCandidates({
    query: sp.query,
    minExperience: sp.minExperience ? Number(sp.minExperience) : undefined,
    maxSalary: sp.maxSalary ? Number(sp.maxSalary) : undefined,
    source: sp.source,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Candidate Repository</h1>
        <Link href="/candidates/new" className="bg-blue-600 text-white rounded px-4 py-2">Add Candidate</Link>
      </div>
      <form className="flex gap-2 mb-4">
        <input name="query" placeholder="Search name/tags/source" defaultValue={sp.query} className="border p-2 rounded" />
        <input name="minExperience" type="number" placeholder="Min experience" defaultValue={sp.minExperience} className="border p-2 rounded" />
        <input name="maxSalary" type="number" placeholder="Max expected salary" defaultValue={sp.maxSalary} className="border p-2 rounded" />
        <button type="submit" className="bg-gray-200 rounded px-4 py-2">Filter</button>
      </form>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Name</th>
            <th className="p-2">Experience</th>
            <th className="p-2">Expected Salary</th>
            <th className="p-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-100">
              <td className="p-2"><Link href={`/candidates/${c.id}`}>{c.name}</Link></td>
              <td className="p-2">{c.years_experience_total}</td>
              <td className="p-2">{c.expected_salary}</td>
              <td className="p-2">{c.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Open `/candidates`, confirm all candidates created so far are listed; use the filter form (e.g., `minExperience=3`) and confirm the list narrows correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/candidates/page.tsx
git commit -m "Add historical candidate repository/search page"
```

---

### Task 15: Public manager scorecard page

**Files:**
- Create: `src/app/scorecard/[token]/page.tsx`
- Create: `src/app/scorecard/[token]/actions.ts`

**Interfaces:**
- Consumes: `getScorecardByToken`, `submitScorecard` (Task 7).
- Produces: working `/scorecard/[token]` route, reachable without login — this is the link generated by Task 11's "Generate Scorecard Link" button.

- [ ] **Step 1: Implement the server action**

Create `src/app/scorecard/[token]/actions.ts`:

```typescript
'use server';

import { submitScorecard } from '@/lib/db/scorecards';
import { redirect } from 'next/navigation';

export async function submitScorecardAction(token: string, formData: FormData) {
  const score = String(formData.get('score') ?? '');
  const comments = String(formData.get('comments') ?? '');
  await submitScorecard(token, score, comments);
  redirect(`/scorecard/${token}?submitted=1`);
}
```

- [ ] **Step 2: Implement the page**

Create `src/app/scorecard/[token]/page.tsx`:

```tsx
import { getScorecardByToken } from '@/lib/db/scorecards';
import { submitScorecardAction } from './actions';

export default async function ScorecardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const scorecard = await getScorecardByToken(token);
  if (!scorecard) return <div>Scorecard link not found.</div>;

  if (scorecard.submitted_at || sp.submitted) {
    return <div className="max-w-md">Thank you — feedback for {scorecard.candidateName} has been recorded.</div>;
  }

  const boundAction = submitScorecardAction.bind(null, token);

  return (
    <form action={boundAction} className="max-w-md flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Interview Feedback</h1>
      <p>Candidate: {scorecard.candidateName}</p>
      <p>Role: {scorecard.openingTitle}</p>
      <p>Stage: {scorecard.stage}</p>
      <select name="score" required defaultValue="" className="border p-2 rounded">
        <option value="" disabled>Select outcome</option>
        <option value="Select">Select</option>
        <option value="Hold">Hold</option>
        <option value="Reject">Reject</option>
      </select>
      <textarea name="comments" placeholder="Comments" className="border p-2 rounded" rows={4} />
      <button type="submit" className="bg-blue-600 text-white rounded p-2">Submit Feedback</button>
    </form>
  );
}
```

- [ ] **Step 3: Verify in the browser**

From an opening's pipeline board (Task 11), click "Generate Scorecard Link", open the link shown (in a fresh/private browser tab to confirm no login is required), submit a score + comment.
Expected: Confirmation message displays; reloading the same link shows the confirmation again instead of the form; the candidate's profile page (Task 13) now shows the submitted scorecard.

- [ ] **Step 4: Commit**

```bash
git add src/app/scorecard/[token]
git commit -m "Add public manager scorecard page"
```

---

### Task 16: Dashboard home page

**Files:**
- Create: `src/app/page.tsx` (replacing the `create-next-app` placeholder)

**Interfaces:**
- Consumes: `listOpenings`, `averageTimeToFill` (Task 4), `getStuckCandidates`, `getStageCounts`, `getAverageTimeInStage` (Task 6).
- Produces: working `/` route — the landing page of the app.

- [ ] **Step 1: Implement the page**

Replace `src/app/page.tsx`:

```tsx
import Link from 'next/link';
import { listOpenings, averageTimeToFill } from '@/lib/db/openings';
import { getStuckCandidates, getStageCounts, getAverageTimeInStage } from '@/lib/db/pipeline';

export default async function DashboardPage() {
  const openings = await listOpenings();
  const stuck = await getStuckCandidates();
  const stageCounts = await getStageCounts();
  const avgTimeInStage = await getAverageTimeInStage();
  const avgFill = await averageTimeToFill();

  const openingsByStatus: Record<string, number> = {};
  for (const o of openings) {
    openingsByStatus[o.status] = (openingsByStatus[o.status] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Recruitment Dashboard</h1>

      <section>
        <h2 className="font-medium mb-2">Openings by status</h2>
        <div className="flex gap-4">
          {Object.entries(openingsByStatus).map(([status, count]) => (
            <div key={status} className="border rounded p-3">
              <p className="text-2xl">{count}</p>
              <p className="text-sm text-gray-600">{status}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Candidates per stage</h2>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div key={stage} className="border rounded p-3">
              <p className="text-2xl">{count}</p>
              <p className="text-sm text-gray-600">{stage}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Average time to fill</h2>
        <p>{avgFill !== null ? `${avgFill.toFixed(1)} days` : 'No filled openings yet'}</p>
      </section>

      <section>
        <h2 className="font-medium mb-2">Average time in stage (bottlenecks)</h2>
        <ul className="list-disc pl-5 text-sm">
          {Object.entries(avgTimeInStage).map(([stage, days]) => (
            <li key={stage}>{stage}: {days.toFixed(1)} days</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2 text-red-600">Stuck candidates ({stuck.length})</h2>
        <ul className="list-disc pl-5 text-sm">
          {stuck.map((c) => (
            <li key={c.candidateOpeningId}>
              <Link href={`/candidates/${c.candidateId}`}>{c.candidateName}</Link> — stuck in {c.currentStage}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Open `http://localhost:3000/`.
Expected: Numbers match what's visible in `/openings` and `/candidates` (e.g., opening-by-status counts sum to the total opening count); a candidate whose stage hasn't changed in 7+ days appears under "Stuck candidates" with a working link to their profile.

- [ ] **Step 3: Delete the verification test data created in Tasks 4–7**

The "Verification Test Role"/"Verification Test Candidate"/etc. rows would otherwise pollute the real dashboard. Delete them via the Supabase Table Editor (openings, candidates, candidate_openings, pipeline_events, scorecards — delete in that dependency order, children before parents) before handing this off for real use.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "Add dashboard home page with pipeline health aggregates"
```

---

### Task 17: Deploy to Vercel

**Files:** none (deployment/configuration only)

**Interfaces:**
- Consumes: the complete app from Tasks 1–16, the user's Vercel account.
- Produces: a live, public URL reachable from any network.

- [ ] **Step 1: Push the repo to a place Vercel can pull from, or deploy directly via CLI**

Ask the user which they'd prefer:
- **Direct CLI deploy (simplest, no GitHub needed):** run `npx vercel login` (opens a browser to authenticate their free Vercel account), then `npx vercel link` to create/link a project.
- **GitHub-connected (auto-deploys on every future push):** user creates a GitHub repo and adds it as a remote; then connects that repo in the Vercel dashboard.

- [ ] **Step 2: Set environment variables on Vercel**

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

Paste in the same values from `.env.local` when prompted.

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

Expected: Command prints a live `https://<project>.vercel.app` URL.

- [ ] **Step 4: Verify the live deployment**

Open the printed URL in a browser (ideally from a different network than the one used to build it, e.g., a phone on mobile data, to confirm it's not accidentally tied to a local network). Walk through: view dashboard, add an opening, add a candidate, advance a stage, generate and submit a scorecard link. Confirm data appears in the same Supabase project.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Document Vercel deployment" --allow-empty
```

(No code changes are expected here — this commit is a checkpoint marking Phase 1 as deployed, if there's nothing else to stage besides what's already committed, skip this step.)
