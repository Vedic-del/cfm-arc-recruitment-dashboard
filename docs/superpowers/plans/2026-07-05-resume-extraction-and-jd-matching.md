# Resume Extraction + JD Match Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace resume file storage with AI-extracted structured summaries, and add an on-demand AI-generated 0–100 fit score (with rationale) between a candidate and an opening's job description.

**Architecture:** Adds a thin Groq REST client, a resume-text-extraction module (PDF/DOCX), and a summarization/scoring layer on top of the existing data layer. New candidate-creation flow extracts+summarizes instead of uploading a file. A new "Match against JD" action scores an existing candidate-opening pair on demand.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (unchanged) + Groq REST API (`llama-3.1-8b-instant`, confirmed reachable) + `pdf-parse` and `mammoth` npm packages (both free, MIT-licensed).

## Global Constraints

- `GROQ_API_KEY` is a server-only env var (already added to `.env.local`/`.env.example`) — never prefix with `NEXT_PUBLIC_`, never send to the browser.
- Model: `llama-3.1-8b-instant` for every Groq call in this plan — consistent choice, already confirmed working against the real API.
- Never block candidate creation on the AI step failing — resume extraction/summarization errors are caught and logged; `resume_summary` stays null, the candidate still gets created.
- Match scoring is user-triggered (a button), never automatic on page load — keeps Groq usage bounded.
- Do not touch `uploadResume`, `getResumeUrl`, `resume_path`, or the `resumes` Storage bucket/policies — they stay in the schema/data-layer for backward compatibility with any historical data; this plan only stops the candidate-creation flow from calling them for new candidates.
- `.doc` (legacy binary Word) is dropped from accepted file types — only PDF and `.docx` are extracted; anything else results in `resume_summary` staying null, not an error.
- Cost ceiling: $0 — Groq free tier only, no new paid services.
- Testing: consistent with the rest of this project, DB/API-touching code is verified live against the real Supabase project and real Groq API via throwaway scripts — no mocking. Authoring a valid binary PDF/DOCX fixture as literal text in this plan isn't practical (DOCX is a zip archive, a byte-perfect PDF xref table can't be hand-verified in a markdown document), so resume-parsing correctness is verified live with real files during Task 5, not with synthetic unit-test fixtures.

## File Structure

```
src/lib/groqClient.ts                        -- Groq REST wrapper (Task 2)
src/lib/resumeParsing.ts                     -- PDF/DOCX text extraction (Task 3)
src/lib/resumeSummary.ts                     -- resume text -> AI summary (Task 4)
src/lib/types.ts                             -- Candidate.resume_summary, CandidateOpening.match_score/match_rationale (Task 1)
src/lib/db/candidates.ts                     -- CreateCandidateInput gains resume_summary (Task 5)
src/lib/db/pipeline.ts                       -- scoreMatch(), PipelineCard gains match fields (Task 6)
src/app/candidates/new/actions.ts            -- extract+summarize instead of upload (Task 5)
src/app/openings/[id]/actions.ts             -- scoreMatchAction (Task 7)
src/app/openings/[id]/PipelineBoard.tsx      -- match score badge + button (Task 7)
src/app/candidates/[id]/page.tsx             -- show match score per pipeline entry (Task 8)
supabase/schema.sql                          -- new columns (Task 1)
```

---

### Task 1: Schema + types for resume summary and match scoring

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Candidate.resume_summary: string | null`, `CandidateOpening.match_score: number | null`, `CandidateOpening.match_rationale: string | null` — consumed by Tasks 5, 6, 7, 8.

- [ ] **Step 1: Append the schema changes**

Append to the end of `supabase/schema.sql`:

```sql

alter table candidates add column resume_summary text;
alter table candidate_openings add column match_score int;
alter table candidate_openings add column match_rationale text;
```

- [ ] **Step 2: Ask the user to run it**

This requires the project owner to act: open the Supabase SQL Editor and run just these three lines. Confirm success with no red error before moving on.

- [ ] **Step 3: Update the shared types**

In `src/lib/types.ts`, add `resume_summary: string | null;` to the `Candidate` interface (after `tags`), and add `match_score: number | null;` and `match_rationale: string | null;` to the `CandidateOpening` interface (after `current_stage`):

```typescript
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
  resume_summary: string | null;
  created_at: string;
}

export interface CandidateOpening {
  id: string;
  candidate_id: string;
  opening_id: string;
  current_stage: Stage;
  match_score: number | null;
  match_rationale: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql src/lib/types.ts
git commit -m "Add resume_summary and match scoring columns"
```

---

### Task 2: Groq client

**Files:**
- Create: `src/lib/groqClient.ts`
- Create: `scripts/verify-groq-client.ts`

**Interfaces:**
- Consumes: `GROQ_API_KEY` env var.
- Produces: `groqChatCompletion(prompt: string): Promise<string>` — consumed by Tasks 4 and 6.

- [ ] **Step 1: Implement the client**

Create `src/lib/groqClient.ts`:

```typescript
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

export async function groqChatCompletion(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Groq API response missing expected content');
  }
  return content;
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-groq-client.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { groqChatCompletion } = await import('../src/lib/groqClient');
  const result = await groqChatCompletion('Reply with exactly the word: OK');
  console.log('Groq response:', JSON.stringify(result));
  console.log('Contains OK:', result.trim().includes('OK'));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-groq-client.ts`
Expected: Prints the raw response and `Contains OK: true`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/groqClient.ts scripts/verify-groq-client.ts
git commit -m "Add Groq REST client"
```

---

### Task 3: Resume text extraction (PDF/DOCX)

**Files:**
- Create: `src/lib/resumeParsing.ts`

**Interfaces:**
- Consumes: `pdf-parse`, `mammoth` npm packages (install both).
- Produces: `extractResumeText(file: File): Promise<string | null>` — consumed by Task 5.

- [ ] **Step 1: Install dependencies**

```bash
npm install pdf-parse mammoth
```

- [ ] **Step 2: Implement extraction**

Create `src/lib/resumeParsing.ts`:

```typescript
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(buffer);
  return result.text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractResumeText(file: File): Promise<string | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.pdf')) {
      return await extractTextFromPdf(buffer);
    }
    if (name.endsWith('.docx')) {
      return await extractTextFromDocx(buffer);
    }
    return null;
  } catch (error) {
    console.error('extractResumeText failed:', error);
    return null;
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors. (If `pdf-parse`'s types aren't picked up cleanly, check whether it needs `@types/pdf-parse` — install it as a dev dependency if `tsc` complains about missing types for the `pdf-parse` import.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/resumeParsing.ts package.json package-lock.json
git commit -m "Add PDF/DOCX resume text extraction"
```

(Real extraction correctness — does a real PDF/DOCX actually yield sensible text — is verified live in Task 5, where a real resume file goes through the full Add Candidate flow. That's a deliberate choice: see Global Constraints on why this task has no synthetic-fixture unit test.)

---

### Task 4: Resume summarization via Groq

**Files:**
- Create: `src/lib/resumeSummary.ts`
- Create: `scripts/verify-resume-summary.ts`

**Interfaces:**
- Consumes: `groqChatCompletion` (Task 2).
- Produces: `summarizeResume(resumeText: string): Promise<string>` — consumed by Task 5.

- [ ] **Step 1: Implement summarization**

Create `src/lib/resumeSummary.ts`:

```typescript
import { groqChatCompletion } from '@/lib/groqClient';

export async function summarizeResume(resumeText: string): Promise<string> {
  const prompt = `You are helping an HR team extract structured, useful information from a candidate's resume for later comparison against job descriptions.

Given the raw resume text below, produce a concise plain-text summary covering:
- Key technical/professional skills
- Total years of experience mentioned (if determinable)
- Education (degree, institution)
- Notable past employers/roles

Keep it under 200 words, no markdown formatting, no preamble — just the summary itself.

Resume text:
"""
${resumeText}
"""`;
  return groqChatCompletion(prompt);
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-resume-summary.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { summarizeResume } = await import('../src/lib/resumeSummary');
  const sampleResume = `
Jane Doe
Software Engineer with 6 years of experience in backend development.
Skills: Node.js, TypeScript, PostgreSQL, AWS.
Education: B.Tech Computer Science, IIT Bombay.
Experience: Senior Engineer at Acme Corp (2021-present), Engineer at Globex (2018-2021).
`;
  const summary = await summarizeResume(sampleResume);
  console.log('Summary:', summary);
  console.log('Mentions Node.js:', summary.toLowerCase().includes('node'));
  console.log('Under 250 words:', summary.split(/\s+/).length < 250);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/verify-resume-summary.ts`
Expected: Prints a plain-text summary; `Mentions Node.js: true`; `Under 250 words: true`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/resumeSummary.ts scripts/verify-resume-summary.ts
git commit -m "Add Groq-based resume summarization"
```

---

### Task 5: Wire extraction+summarization into Add Candidate

**Files:**
- Modify: `src/lib/db/candidates.ts`
- Modify: `src/app/candidates/new/actions.ts`

**Interfaces:**
- Consumes: `extractResumeText` (Task 3), `summarizeResume` (Task 4).
- Produces: `CreateCandidateInput.resume_summary?: string` — no longer calls `uploadResume` from this action.

- [ ] **Step 1: Add `resume_summary` to `CreateCandidateInput`**

In `src/lib/db/candidates.ts`, add `resume_summary?: string;` to the `CreateCandidateInput` interface (after `tags?: string;`). Do not modify `uploadResume`, `getResumeUrl`, or `createCandidate` itself — `createCandidate` already passes through whatever fields are in its input object.

- [ ] **Step 2: Replace the resume handling in the server action**

Replace `src/app/candidates/new/actions.ts` with:

```typescript
'use server';

import { createCandidate } from '@/lib/db/candidates';
import { linkCandidateToOpening } from '@/lib/db/pipeline';
import { extractResumeText } from '@/lib/resumeParsing';
import { summarizeResume } from '@/lib/resumeSummary';
import { redirect } from 'next/navigation';

export async function createCandidateAction(formData: FormData) {
  const name = String(formData.get('name') ?? '');
  if (!name.trim()) throw new Error('Name is required');
  const openingId = String(formData.get('opening_id') ?? '');
  if (!openingId) throw new Error('An opening must be selected');

  let resumeSummary: string | undefined;
  const resumeFile = formData.get('resume') as File | null;
  if (resumeFile && resumeFile.size > 0) {
    try {
      const text = await extractResumeText(resumeFile);
      if (text && text.trim().length > 0) {
        resumeSummary = await summarizeResume(text);
      }
    } catch (error) {
      console.error('Resume extraction/summarization failed:', error);
    }
  }

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
    resume_summary: resumeSummary,
  });

  await linkCandidateToOpening(candidate.id, openingId);
  redirect(`/candidates/${candidate.id}`);
}
```

Note: this deliberately no longer calls `uploadResume` — the resume file is read into memory for extraction only and never persisted anywhere.

- [ ] **Step 3: Verify live with a real resume file**

Run the dev server (reuse if already running). Navigate to `/candidates/new`, fill in a name and select an opening, attach a real PDF resume (any real PDF with actual text content — not a scanned image), submit. Confirm it redirects to the candidate's profile page, then via a throwaway script confirm `resume_summary` is set and non-empty on the new candidate row, and confirm no new file appears in the Supabase `resumes` Storage bucket for this candidate (check the bucket via the dashboard, or list objects via a throwaway script). If you have a real `.docx` resume available, repeat with one to confirm that path also works — if not, note in your report that only the PDF path was live-verified and the DOCX code path is implemented but unverified in this pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/candidates.ts src/app/candidates/new/actions.ts
git commit -m "Extract and summarize resumes via AI instead of storing files"
```

---

### Task 6: Match scoring data layer

**Files:**
- Modify: `src/lib/db/pipeline.ts`
- Create: `scripts/verify-score-match.ts`

**Interfaces:**
- Consumes: `groqChatCompletion` (Task 2), `Candidate.resume_summary`/`Opening.description` (Task 1).
- Produces: `scoreMatch(candidateOpeningId: string): Promise<{ score: number; rationale: string }>`; `PipelineCard` gains `matchScore: number | null` and `matchRationale: string | null`; `getPipelineForOpening`'s underlying select includes `match_score`/`match_rationale` — consumed by Tasks 7 and 8.

- [ ] **Step 1: Extend `PipelineCard` and the shared row type**

In `src/lib/db/pipeline.ts`, update the `PipelineCard` interface and `PipelineCardRow` interface to include the two new fields, and update `toPipelineCard` and `getPipelineForOpening`'s select string to carry them through:

```typescript
export interface PipelineCard {
  candidateOpeningId: string;
  candidateId: string;
  candidateName: string;
  currentStage: Stage;
  latestEnteredAt: string;
  stuck: boolean;
  matchScore: number | null;
  matchRationale: string | null;
}
```

Update `PipelineCardRow` (the interface immediately above `toPipelineCard`) to add:

```typescript
  match_score: number | null;
  match_rationale: string | null;
```

Update `toPipelineCard` to include the two new fields in its returned object:

```typescript
  return {
    candidateOpeningId: row.id,
    candidateId: row.candidate_id,
    candidateName: row.candidates.name,
    currentStage: row.current_stage,
    latestEnteredAt: latest.entered_at,
    stuck: isStuck(events),
    matchScore: row.match_score,
    matchRationale: row.match_rationale,
  };
```

Update `getPipelineForOpening`'s `.select(...)` call to include the new columns — change:

```typescript
    .select('id, current_stage, candidate_id, candidates(name), pipeline_events(stage, entered_at)')
```

to:

```typescript
    .select('id, current_stage, candidate_id, match_score, match_rationale, candidates(name), pipeline_events(stage, entered_at)')
```

`getStuckCandidates` also calls `toPipelineCard` — update its `.select(...)` call the same way, for data consistency (its `PipelineCardRow` cast goes through `unknown`, so `tsc` won't catch a mismatch here on its own; do it anyway since it's a one-line, zero-cost change and keeps `matchScore`/`matchRationale` genuinely `null` rather than `undefined` for every caller of `toPipelineCard`, not just the ones that happen to select the columns). Change:

```typescript
    .not('current_stage', 'in', '(Joined,Rejected,Dropped)');
```

to (adding the columns to the `.select(...)` call directly above that line):

```typescript
    .select('id, current_stage, candidate_id, match_score, match_rationale, candidates(name), pipeline_events(stage, entered_at)')
    .not('current_stage', 'in', '(Joined,Rejected,Dropped)');
```

- [ ] **Step 2: Implement `scoreMatch`**

Add to `src/lib/db/pipeline.ts`:

```typescript
import { groqChatCompletion } from '@/lib/groqClient';

interface ScoreMatchRow {
  id: string;
  candidates: { resume_summary: string | null };
  openings: { description: string | null };
}

export async function scoreMatch(candidateOpeningId: string): Promise<{ score: number; rationale: string }> {
  const { data, error } = await supabase
    .from('candidate_openings')
    .select('id, candidates(resume_summary), openings(description)')
    .eq('id', candidateOpeningId)
    .single();
  if (error) throw new Error(`scoreMatch fetch failed: ${error.message}`);

  const row = data as unknown as ScoreMatchRow;
  const resumeSummary = row.candidates.resume_summary;
  const jd = row.openings.description;
  if (!resumeSummary || !jd) {
    throw new Error('scoreMatch requires both a resume summary and a job description');
  }

  const prompt = `You are helping an HR team score how well a candidate fits a role.

Job description:
"""
${jd}
"""

Candidate summary:
"""
${resumeSummary}
"""

Respond with ONLY a JSON object of the exact shape {"score": <integer 0-100>, "rationale": "<one or two sentence explanation>"} and nothing else — no markdown, no code fences.`;

  const raw = await groqChatCompletion(prompt);
  let parsed: { score: number; rationale: string };
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error(`scoreMatch: Groq response was not valid JSON: ${raw}`);
  }
  if (typeof parsed.score !== 'number' || typeof parsed.rationale !== 'string') {
    throw new Error(`scoreMatch: Groq response missing expected fields: ${raw}`);
  }

  const { error: updateError } = await supabase
    .from('candidate_openings')
    .update({ match_score: parsed.score, match_rationale: parsed.rationale })
    .eq('id', candidateOpeningId);
  if (updateError) throw new Error(`scoreMatch update failed: ${updateError.message}`);

  return parsed;
}
```

Add `import { groqChatCompletion } from '@/lib/groqClient';` to the top of the file alongside the existing imports.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors. Resolve as described in Step 1's note if `getStuckCandidates` needs the extra select columns too.

- [ ] **Step 4: Write the verification script**

Create `scripts/verify-score-match.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { createOpening } = await import('../src/lib/db/openings');
  const { createCandidate } = await import('../src/lib/db/candidates');
  const { linkCandidateToOpening, scoreMatch } = await import('../src/lib/db/pipeline');

  const opening = await createOpening({
    title: 'Match Score Verify Role',
    description: 'Looking for a backend engineer with 5+ years of Node.js and PostgreSQL experience.',
  });
  const candidate = await createCandidate({
    name: 'Match Score Verify Candidate',
    resume_summary: 'Software engineer with 6 years of experience in Node.js, TypeScript, and PostgreSQL. B.Tech Computer Science.',
  });
  const co = await linkCandidateToOpening(candidate.id, opening.id);

  const result = await scoreMatch(co.id);
  console.log('Score:', result.score, '(expect a reasonably high number given the strong overlap)');
  console.log('Rationale:', result.rationale);
  console.log('Score is a number 0-100:', typeof result.score === 'number' && result.score >= 0 && result.score <= 100);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 5: Run the verification script**

Run: `npx tsx scripts/verify-score-match.ts`
Expected: Prints a score and rationale; `Score is a number 0-100: true`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/pipeline.ts scripts/verify-score-match.ts
git commit -m "Add AI-based JD match scoring to pipeline data layer"
```

---

### Task 7: "Match against JD" UI on the pipeline board

**Files:**
- Modify: `src/app/openings/[id]/actions.ts`
- Modify: `src/app/openings/[id]/PipelineBoard.tsx`

**Interfaces:**
- Consumes: `scoreMatch` (Task 6), `PipelineCard.matchScore`/`matchRationale` (Task 6).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Add the server action**

In `src/app/openings/[id]/actions.ts`, add this function alongside the existing ones (`advanceStageAction`, `generateScorecardAction`, `markOpeningFilledAction`):

```typescript
import { scoreMatch } from '@/lib/db/pipeline';

export async function scoreMatchAction(candidateOpeningId: string): Promise<{ score: number; rationale: string }> {
  return scoreMatch(candidateOpeningId);
}
```

(Add the `scoreMatch` import to the existing `import { advanceStage } from '@/lib/db/pipeline';` line — combine into one import: `import { advanceStage, scoreMatch } from '@/lib/db/pipeline';`.)

- [ ] **Step 2: Update the pipeline board UI**

In `src/app/openings/[id]/PipelineBoard.tsx`, import `scoreMatchAction` alongside the existing action imports, add local state for match errors/loading, and render a match badge + button per card. Add this import:

```typescript
import { advanceStageAction, generateScorecardAction, scoreMatchAction } from './actions';
```

Add a helper above the component (after the `ProgressRail` function, before `export function PipelineBoard`):

```typescript
function matchBadgeClasses(score: number): string {
  if (score < 40) return 'bg-danger-bg text-danger';
  if (score < 70) return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-forest-900';
}
```

Inside the `PipelineBoard` component, add a handler alongside `handleGenerateLink`:

```typescript
  async function handleScoreMatch(candidateOpeningId: string) {
    try {
      await scoreMatchAction(candidateOpeningId);
      setErrors((prev) => ({ ...prev, [candidateOpeningId]: '' }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        [candidateOpeningId]: 'Failed to score match — make sure both a resume summary and a job description exist.',
      }));
    }
  }
```

In the card's render, right after the closing `</div>` of the stage-select/generate-link-button row (the `<div className="mt-3 flex flex-wrap items-center gap-2">...</div>` block) and before the existing error/link display blocks, add:

```tsx
          <div className="mt-2 flex items-center gap-2">
            {card.matchScore !== null ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${matchBadgeClasses(card.matchScore)}`}
                title={card.matchRationale ?? ''}
              >
                Match: {card.matchScore}/100
              </span>
            ) : (
              <button
                onClick={() => handleScoreMatch(card.candidateOpeningId)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-forest-900 transition-colors hover:bg-slate-100"
              >
                Match against JD
              </button>
            )}
          </div>
          {card.matchRationale && card.matchScore !== null && (
            <p className="mt-1 text-xs text-slate">{card.matchRationale}</p>
          )}
```

Note this component already re-renders with fresh `cards` props after any server action (via `revalidatePath` in the calling actions) — but `scoreMatchAction` doesn't call `revalidatePath` itself (unlike `advanceStageAction`). Since the score is meant to persist and display without a full page reload interrupting the user's flow, and the plan wants this action's result reflected immediately: after a successful `scoreMatchAction` call in `handleScoreMatch`, also track the returned score/rationale in local component state (mirroring the `links` state pattern) so it displays immediately without waiting for a server re-fetch. Add a new state variable `const [scores, setScores] = useState<Record<string, { score: number; rationale: string }>>({});` alongside `links` and `errors`, set it in `handleScoreMatch` on success (`setScores((prev) => ({ ...prev, [candidateOpeningId]: result }));`), and use `scores[card.candidateOpeningId] ?? (card.matchScore !== null ? { score: card.matchScore, rationale: card.matchRationale ?? '' } : null)` as the effective value when rendering the badge, instead of reading `card.matchScore`/`card.matchRationale` directly.

- [ ] **Step 3: Verify live**

Use the candidate/opening pair created by Task 6's verification script (or create a fresh one), navigate to `/openings/<the opening's id>`, confirm the card shows a "Match against JD" button, click it, confirm a colored score badge with the rationale appears without a page reload, and confirm via a throwaway script that `match_score`/`match_rationale` are persisted on the `candidate_openings` row.

- [ ] **Step 4: Commit**

```bash
git add src/app/openings/[id]/actions.ts src/app/openings/[id]/PipelineBoard.tsx
git commit -m "Add Match against JD button and score badge to pipeline board"
```

---

### Task 8: Show match score on candidate profile page

**Files:**
- Modify: `src/app/candidates/[id]/page.tsx`

**Interfaces:**
- Consumes: `CandidateOpening.match_score`/`match_rationale` (Task 1) via the existing `getCandidateOpenings` call (already selects `'*, openings(title)'`, which includes the new columns automatically — no data-layer change needed).
- Produces: nothing new for later tasks — final task in this plan.

- [ ] **Step 1: Display the match score per pipeline entry**

In `src/app/candidates/[id]/page.tsx`, inside the `pipelineDetails.map(({ co, history, scorecards }) => (...))` block, right after the `<p className="font-medium text-ink">{co.openingTitle} ...</p>` line, add:

```tsx
              {co.match_score !== null && (
                <p className="mt-1 text-sm text-slate">
                  Match score: <span className="font-semibold text-forest-900">{co.match_score}/100</span>
                  {co.match_rationale && <span> — {co.match_rationale}</span>}
                </p>
              )}
```

- [ ] **Step 2: Verify live**

Navigate to `/candidates/<id>` for the candidate used in Task 7's verification (the one that was scored). Confirm the match score and rationale display under the relevant opening in "Pipeline history".

- [ ] **Step 3: Commit**

```bash
git add src/app/candidates/[id]/page.tsx
git commit -m "Show match score on candidate profile page"
```
