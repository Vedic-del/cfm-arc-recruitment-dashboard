# JD Field + Edit Opening + Edit Candidate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Job Description field to Openings (settable and editable), and let Candidates be edited after creation.

**Architecture:** Extends the existing Next.js/Supabase app from the prior plan (docs/superpowers/plans/2026-07-04-hr-recruitment-dashboard.md) — same data-layer/page conventions, same design system (forest-green Tailwind theme from the redesign). No new services, no new dependencies.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Supabase (Postgres) — unchanged from the existing app.

## Global Constraints

- Follow the existing design system exactly: primary button `rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700`; secondary/outline button `rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100`; input `w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition`; label `mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate`; card `rounded-xl border border-slate-200 bg-white p-6 shadow-sm`; h1 `font-display text-2xl font-bold tracking-tight text-forest-950`.
- Verify scripts use the dynamic-import-after-dotenv pattern (`dotenv.config()` at top level, data-layer modules imported via `await import(...)` inside `main()`) — a static top-level import of a data-layer module gets hoisted ahead of `dotenv.config()` and silently breaks env loading.
- Testing: throwaway `scripts/verify-*.ts` against the live Supabase project for data-layer functions; live browser verification for pages. No unit-test framework needed for this plan (no new pure logic).
- Cost ceiling: $0 — no new services or paid tiers.
- Out of scope (do not implement): AI resume ranking, resume text extraction, bulk import, delete/archive for openings or candidates. These belong to a separate, later plan.

## File Structure

```
supabase/schema.sql                          -- add `description` column (Task 1)
src/lib/types.ts                             -- Opening gains `description` (Task 1)
src/lib/db/openings.ts                       -- CreateOpeningInput gains `description`, add updateOpening (Task 2)
src/lib/db/candidates.ts                     -- add updateCandidate (Task 3)
src/app/openings/new/{actions.ts,page.tsx}   -- add description textarea (Task 4)
src/app/openings/[id]/edit/{actions.ts,page.tsx} -- new Edit Opening page (Task 5)
src/app/openings/[id]/page.tsx               -- show JD + Edit link (Task 6)
src/app/candidates/[id]/edit/{actions.ts,page.tsx} -- new Edit Candidate page (Task 7)
src/app/candidates/[id]/page.tsx             -- add Edit link (Task 8)
```

---

### Task 1: Schema + shared type for the JD field

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Opening.description: string | null` — consumed by Tasks 2, 4, 5, 6.

- [ ] **Step 1: Append the schema change**

Append to the end of `supabase/schema.sql`:

```sql

alter table openings add column description text;
```

- [ ] **Step 2: Ask the user to run it**

This requires the project owner to act: open the Supabase SQL Editor and run just this one line (not the whole file — the tables already exist): `alter table openings add column description text;`. Confirm it shows success with no red error before moving on.

- [ ] **Step 3: Add the field to the shared type**

In `src/lib/types.ts`, find the `Opening` interface and add `description` (place it after `level`):

```typescript
export interface Opening {
  id: string;
  title: string;
  department: string | null;
  level: string | null;
  description: string | null;
  hiring_manager: string | null;
  positions_count: number;
  date_opened: string;
  priority: Priority;
  status: OpeningStatus;
  target_close_date: string | null;
  filled_at: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors (the `Opening` interface change alone doesn't break anything yet — nothing constructs a full `Opening` object literal elsewhere).

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql src/lib/types.ts
git commit -m "Add description (JD) column to openings"
```

---

### Task 2: Openings data layer — description support + updateOpening

**Files:**
- Modify: `src/lib/db/openings.ts`
- Create: `scripts/verify-update-opening.ts`

**Interfaces:**
- Consumes: `supabase` (`@/lib/supabaseClient`), `Opening`, `OpeningStatus`, `Priority` (`@/lib/types`), `timeToFill` (`@/lib/pipelineLogic`).
- Produces: `CreateOpeningInput.description?: string`, `updateOpening(id: string, input: CreateOpeningInput): Promise<void>` — consumed by Tasks 4 (description passthrough) and 5 (Edit Opening page).

- [ ] **Step 1: Add `description` to `CreateOpeningInput` and implement `updateOpening`**

In `src/lib/db/openings.ts`, add `description?: string;` to the `CreateOpeningInput` interface (after `level?: string;`), and add this function after `updateOpeningStatus`:

```typescript
export async function updateOpening(id: string, input: CreateOpeningInput): Promise<void> {
  const { error } = await supabase.from('openings').update(input).eq('id', id);
  if (error) throw new Error(`updateOpening failed: ${error.message}`);
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-update-opening.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening, getOpening, updateOpening } = await import('../src/lib/db/openings');

  const opening = await createOpening({ title: 'Update Verify Role' });
  console.log('Created without description, description is null:', opening.description === null);

  await updateOpening(opening.id, { title: 'Update Verify Role (edited)', description: 'Own the recovery pipeline end to end.' });
  const updated = await getOpening(opening.id);
  console.log('Title updated:', updated?.title === 'Update Verify Role (edited)');
  console.log('Description set:', updated?.description === 'Own the recovery pipeline end to end.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-update-opening.ts`
Expected: All three boolean lines print `true`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/openings.ts scripts/verify-update-opening.ts
git commit -m "Add description field support and updateOpening to openings data layer"
```

---

### Task 3: Candidates data layer — updateCandidate

**Files:**
- Modify: `src/lib/db/candidates.ts`
- Create: `scripts/verify-update-candidate.ts`

**Interfaces:**
- Consumes: `supabase` (`@/lib/supabaseClient`), `Candidate` (`@/lib/types`), existing `CreateCandidateInput`.
- Produces: `updateCandidate(id: string, input: CreateCandidateInput): Promise<void>` — consumed by Task 7 (Edit Candidate page).

- [ ] **Step 1: Implement `updateCandidate`**

In `src/lib/db/candidates.ts`, add this function after `createCandidate`:

```typescript
export async function updateCandidate(id: string, input: CreateCandidateInput): Promise<void> {
  const { error } = await supabase.from('candidates').update(input).eq('id', id);
  if (error) throw new Error(`updateCandidate failed: ${error.message}`);
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-update-candidate.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createCandidate, getCandidate, updateCandidate } = await import('../src/lib/db/candidates');

  const candidate = await createCandidate({ name: 'Update Verify Candidate' });
  console.log('Created, years_experience_total is null:', candidate.years_experience_total === null);

  await updateCandidate(candidate.id, {
    name: 'Update Verify Candidate',
    years_experience_total: 6,
    current_salary: 1400000,
    expected_salary: 1800000,
    notice_period: '30 days',
  });
  const updated = await getCandidate(candidate.id);
  console.log('years_experience_total set:', updated?.years_experience_total === 6);
  console.log('notice_period set:', updated?.notice_period === '30 days');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-update-candidate.ts`
Expected: All three boolean lines print `true`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/candidates.ts scripts/verify-update-candidate.ts
git commit -m "Add updateCandidate to candidates data layer"
```

---

### Task 4: Add Opening form — description field

**Files:**
- Modify: `src/app/openings/new/actions.ts`
- Modify: `src/app/openings/new/page.tsx`

**Interfaces:**
- Consumes: `createOpening` (Task 2, now accepting `description`).
- Produces: nothing new for later tasks — this is a leaf UI change.

- [ ] **Step 1: Pass `description` through in the server action**

Replace `src/app/openings/new/actions.ts` with:

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
    description: String(formData.get('description') ?? '') || undefined,
    hiring_manager: String(formData.get('hiring_manager') ?? '') || undefined,
    positions_count: Number(formData.get('positions_count') ?? 1),
    date_opened: String(formData.get('date_opened') ?? '') || undefined,
    priority: (formData.get('priority') as Priority) ?? 'normal',
    target_close_date: String(formData.get('target_close_date') ?? '') || undefined,
  });
  redirect(`/openings/${opening.id}`);
}
```

- [ ] **Step 2: Add the textarea to the form**

In `src/app/openings/new/page.tsx`, add a JD field between the "Hiring manager" field and the "Positions / Priority" grid row:

```tsx
        <div>
          <label className={LABEL}>Job description</label>
          <textarea name="description" placeholder="What does this role actually need?" rows={5} className={INPUT} />
        </div>
```

(Insert it as its own block, matching the existing pattern of other single-field blocks in that file — after the "Hiring manager" `<div>` and before the "Positions / Priority" `grid grid-cols-2` `<div>`.)

- [ ] **Step 3: Verify live**

Run the dev server (reuse if already running), navigate to `/openings/new`, fill in a title and a description, submit. Confirm it redirects to `/openings/<id>` and — using a throwaway script or the Supabase Table Editor — confirm the `description` column has the text you entered.

- [ ] **Step 4: Commit**

```bash
git add src/app/openings/new/actions.ts src/app/openings/new/page.tsx
git commit -m "Add job description field to Add Opening form"
```

---

### Task 5: Edit Opening page

**Files:**
- Create: `src/app/openings/[id]/edit/actions.ts`
- Create: `src/app/openings/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `getOpening`, `updateOpening` (Task 2), `Priority` (`@/lib/types`).
- Produces: working `/openings/[id]/edit` route — linked from Task 6.

- [ ] **Step 1: Implement the server action**

Create `src/app/openings/[id]/edit/actions.ts`:

```typescript
'use server';

import { updateOpening } from '@/lib/db/openings';
import { redirect } from 'next/navigation';
import type { Priority } from '@/lib/types';

export async function updateOpeningAction(openingId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '');
  if (!title.trim()) throw new Error('Title is required');
  await updateOpening(openingId, {
    title,
    department: String(formData.get('department') ?? '') || undefined,
    level: String(formData.get('level') ?? '') || undefined,
    description: String(formData.get('description') ?? '') || undefined,
    hiring_manager: String(formData.get('hiring_manager') ?? '') || undefined,
    positions_count: Number(formData.get('positions_count') ?? 1),
    priority: (formData.get('priority') as Priority) ?? 'normal',
    target_close_date: String(formData.get('target_close_date') ?? '') || undefined,
  });
  redirect(`/openings/${openingId}`);
}
```

- [ ] **Step 2: Implement the page**

Create `src/app/openings/[id]/edit/page.tsx`:

```tsx
import { getOpening } from '@/lib/db/openings';
import { updateOpeningAction } from './actions';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate';

export default async function EditOpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = await getOpening(id);
  if (!opening) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">Opening not found.</p>
      </div>
    );
  }
  const boundAction = updateOpeningAction.bind(null, opening.id);

  return (
    <div className="mx-auto max-w-xl animate-fade-in-up">
      <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Edit Opening</h1>
      <p className="mt-1 text-sm text-slate">Update the details for {opening.title}.</p>

      <form action={boundAction} className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className={LABEL}>Role title</label>
          <input name="title" defaultValue={opening.title} required className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Department</label>
            <input name="department" defaultValue={opening.department ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Level / grade</label>
            <input name="level" defaultValue={opening.level ?? ''} className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Hiring manager</label>
          <input name="hiring_manager" defaultValue={opening.hiring_manager ?? ''} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Job description</label>
          <textarea name="description" defaultValue={opening.description ?? ''} rows={5} className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Positions</label>
            <input name="positions_count" type="number" defaultValue={opening.positions_count} min={1} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Priority</label>
            <select name="priority" defaultValue={opening.priority} className={INPUT}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL}>Target close date</label>
          <input name="target_close_date" type="date" defaultValue={opening.target_close_date ?? ''} className={INPUT} />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify live**

Navigate to `/openings/<an existing opening's id>/edit`, confirm every field is pre-filled with the opening's current values, change the description and title, submit. Confirm it redirects to `/openings/<id>` and the change is visible (once Task 6 adds JD display — until then, confirm via a throwaway script or Table Editor that the row updated correctly).

- [ ] **Step 4: Commit**

```bash
git add src/app/openings/[id]/edit
git commit -m "Add Edit Opening page"
```

---

### Task 6: Opening detail page — show JD + Edit link

**Files:**
- Modify: `src/app/openings/[id]/page.tsx`

**Interfaces:**
- Consumes: `Opening.description` (Task 1).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Add the JD display and Edit link**

In `src/app/openings/[id]/page.tsx`, add an `Edit` link next to the existing "Add Candidate" / "Mark Filled" buttons, and a JD section below the header block and above `<PipelineBoard ... />`. The file currently reads (for reference, so you can locate the exact insertion points):

```tsx
import Link from 'next/link';
import { getOpening } from '@/lib/db/openings';
import { getPipelineForOpening } from '@/lib/db/pipeline';
import { PipelineBoard } from './PipelineBoard';
import { markOpeningFilledAction } from './actions';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-forest-900',
  on_hold: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate',
  filled: 'bg-forest-900 text-green-100',
};

export default async function OpeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = await getOpening(id);
  if (!opening) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">Opening not found.</p>
      </div>
    );
  }
  const cards = await getPipelineForOpening(id);
  const boundMarkFilled = markOpeningFilledAction.bind(null, opening.id);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">{opening.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate">
            {opening.department}
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[opening.status] ?? 'bg-slate-100 text-slate'}`}
            >
              {opening.status.replace('_', ' ')}
            </span>
            · Opened {opening.date_opened}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/candidates/new?openingId=${opening.id}`}
            className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
          >
            + Add Candidate
          </Link>
          <form action={boundMarkFilled}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
            >
              Mark Filled
            </button>
          </form>
        </div>
      </div>
      <PipelineBoard openingId={opening.id} cards={cards} />
    </div>
  );
}
```

Replace it with:

```tsx
import Link from 'next/link';
import { getOpening } from '@/lib/db/openings';
import { getPipelineForOpening } from '@/lib/db/pipeline';
import { PipelineBoard } from './PipelineBoard';
import { markOpeningFilledAction } from './actions';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-forest-900',
  on_hold: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate',
  filled: 'bg-forest-900 text-green-100',
};

export default async function OpeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opening = await getOpening(id);
  if (!opening) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">Opening not found.</p>
      </div>
    );
  }
  const cards = await getPipelineForOpening(id);
  const boundMarkFilled = markOpeningFilledAction.bind(null, opening.id);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">{opening.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate">
            {opening.department}
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[opening.status] ?? 'bg-slate-100 text-slate'}`}
            >
              {opening.status.replace('_', ' ')}
            </span>
            · Opened {opening.date_opened}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/openings/${opening.id}/edit`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
          >
            Edit
          </Link>
          <Link
            href={`/candidates/new?openingId=${opening.id}`}
            className="rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
          >
            + Add Candidate
          </Link>
          <form action={boundMarkFilled}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
            >
              Mark Filled
            </button>
          </form>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-slate">Job description</h2>
        {opening.description ? (
          <p className="whitespace-pre-wrap text-sm text-ink">{opening.description}</p>
        ) : (
          <p className="text-sm italic text-slate">No JD added yet — click Edit to add one.</p>
        )}
      </div>

      <PipelineBoard openingId={opening.id} cards={cards} />
    </div>
  );
}
```

- [ ] **Step 2: Verify live**

Navigate to `/openings/<id>` for an opening with a JD set (from Task 5's test) and one without. Confirm the JD text displays for the first, and the "No JD added yet" hint shows for the second. Confirm the "Edit" link goes to `/openings/<id>/edit`.

- [ ] **Step 3: Commit**

```bash
git add src/app/openings/[id]/page.tsx
git commit -m "Show job description and Edit link on opening detail page"
```

---

### Task 7: Edit Candidate page

**Files:**
- Create: `src/app/candidates/[id]/edit/actions.ts`
- Create: `src/app/candidates/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `getCandidate`, `updateCandidate` (Task 3).
- Produces: working `/candidates/[id]/edit` route — linked from Task 8.

- [ ] **Step 1: Implement the server action**

Create `src/app/candidates/[id]/edit/actions.ts`:

```typescript
'use server';

import { updateCandidate } from '@/lib/db/candidates';
import { redirect } from 'next/navigation';

export async function updateCandidateAction(candidateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '');
  if (!name.trim()) throw new Error('Name is required');
  await updateCandidate(candidateId, {
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
  redirect(`/candidates/${candidateId}`);
}
```

- [ ] **Step 2: Implement the page**

Create `src/app/candidates/[id]/edit/page.tsx`:

```tsx
import { getCandidate } from '@/lib/db/candidates';
import { updateCandidateAction } from './actions';

const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-green-400/40 transition';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate';

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate">Candidate not found.</p>
      </div>
    );
  }
  const boundAction = updateCandidateAction.bind(null, candidate.id);

  return (
    <div className="mx-auto max-w-xl animate-fade-in-up">
      <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">Edit Candidate</h1>
      <p className="mt-1 text-sm text-slate">Update what you've learned about {candidate.name} since sourcing.</p>

      <form action={boundAction} className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className={LABEL}>Full name</label>
          <input name="name" defaultValue={candidate.name} required className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Phone</label>
            <input name="phone" defaultValue={candidate.phone ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input name="email" defaultValue={candidate.email ?? ''} className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Location</label>
          <input name="location" defaultValue={candidate.location ?? ''} className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Current employer</label>
            <input name="current_employer" defaultValue={candidate.current_employer ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Current designation</label>
            <input name="current_designation" defaultValue={candidate.current_designation ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Experience (total)</label>
            <input name="years_experience_total" type="number" step="0.5" defaultValue={candidate.years_experience_total ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Experience (relevant)</label>
            <input name="years_experience_relevant" type="number" step="0.5" defaultValue={candidate.years_experience_relevant ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Current salary (CTC)</label>
            <input name="current_salary" type="number" defaultValue={candidate.current_salary ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Expected salary</label>
            <input name="expected_salary" type="number" defaultValue={candidate.expected_salary ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Notice period</label>
            <input name="notice_period" defaultValue={candidate.notice_period ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Source</label>
            <input name="source" defaultValue={candidate.source ?? ''} className={INPUT} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Tags / notes</label>
          <input name="tags" defaultValue={candidate.tags ?? ''} className={INPUT} />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify live**

Navigate to `/candidates/<an existing candidate's id>/edit`, confirm every field is pre-filled, change the years of experience and notice period, submit. Confirm it redirects to `/candidates/<id>` and the change is visible there.

- [ ] **Step 4: Commit**

```bash
git add src/app/candidates/[id]/edit
git commit -m "Add Edit Candidate page"
```

---

### Task 8: Candidate profile page — Edit link

**Files:**
- Modify: `src/app/candidates/[id]/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new for later tasks — this is the final task in this plan.

- [ ] **Step 1: Add the Edit link**

In `src/app/candidates/[id]/page.tsx`, the header currently reads:

```tsx
      <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">{candidate.name}</h1>
      <p className="mt-1 text-sm text-slate">
        {candidate.current_designation ?? 'No title on file'}
        {candidate.current_employer ? ` at ${candidate.current_employer}` : ''}
      </p>
```

Replace it with (adds `Link` import at the top of the file, and wraps the name/title block with a flex row containing the Edit link):

```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-forest-950">{candidate.name}</h1>
          <p className="mt-1 text-sm text-slate">
            {candidate.current_designation ?? 'No title on file'}
            {candidate.current_employer ? ` at ${candidate.current_employer}` : ''}
          </p>
        </div>
        <Link
          href={`/candidates/${candidate.id}/edit`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest-900 transition-colors hover:bg-slate-100"
        >
          Edit
        </Link>
      </div>
```

Add the import at the top of the file (alongside the existing imports):

```tsx
import Link from 'next/link';
```

- [ ] **Step 2: Verify live**

Navigate to `/candidates/<id>`, confirm the "Edit" link appears next to the candidate's name and goes to `/candidates/<id>/edit`.

- [ ] **Step 3: Commit**

```bash
git add src/app/candidates/[id]/page.tsx
git commit -m "Add Edit link to candidate profile page"
```
