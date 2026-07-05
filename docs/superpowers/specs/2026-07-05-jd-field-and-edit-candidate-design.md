# JD Field + Edit Opening + Edit Candidate — Design

**Company:** CFM Asset Reconstruction Company
**Date:** 2026-07-05
**Status:** Approved for build

## Problem

Two gaps surfaced while scoping Phase 2 (AI features):

1. Openings have no Job Description field. A JD is required for the upcoming AI resume-ranking feature to have something to rank candidates against, and is generally useful documentation regardless of AI.
2. There is no way to edit a candidate after creation. Fields like years of experience, current/expected salary, and notice period are often not known at sourcing time — they surface later during screening — and today the only place to set them is the one-time "Add Candidate" form.

A companion gap: since two real openings already exist in the live database without a JD, an "add JD at creation only" fix would leave them permanently blank. This spec adds Edit Opening alongside the new field so existing openings aren't stuck.

## Goals

- Openings have a `description` (JD) field, settable at creation and editable afterward.
- Candidates can be edited after creation — every field the "Add Candidate" form sets is also editable.

## Non-goals (deferred to the next spec)

- AI resume ranking against the JD.
- AI-extracted resume text / removing resume file storage.
- Bulk spreadsheet import.
- Delete/archive for openings or candidates.

## Data model changes

- `openings.description` (text, nullable) — the JD. Added via `alter table openings add column description text;` in `supabase/schema.sql`, run manually against the live project like prior schema changes.
- `Opening` type (`src/lib/types.ts`) gains `description: string | null`.
- No new tables. `Candidate`/`CreateCandidateInput` types are unchanged — edit reuses the existing field set.

## Data layer changes

- `src/lib/db/openings.ts`: new `updateOpening(id, input)` — updates title/department/level/hiring_manager/positions_count/priority/target_close_date/description. `CreateOpeningInput` gains optional `description`; `createOpening` passes it through.
- `src/lib/db/candidates.ts`: new `updateCandidate(id, input)` — updates every field `createCandidate` accepts (name, phone, email, location, current_employer, current_designation, years_experience_total, years_experience_relevant, current_salary, expected_salary, notice_period, source, tags). Resume/file handling is untouched by this spec.

## Pages

1. **Add Opening** (`/openings/new`) — add a `description` textarea.
2. **Edit Opening** (`/openings/[id]/edit`, new) — form pre-filled with the opening's current values, submits to `updateOpening`, redirects back to `/openings/[id]`.
3. **Opening detail** (`/openings/[id]`) — show the JD (if set; otherwise a muted "No JD yet" hint) and an "Edit" link to the new edit page.
4. **Edit Candidate** (`/candidates/[id]/edit`, new) — form pre-filled with the candidate's current values (same fields as Add Candidate, minus opening selection and resume upload — those stay creation-only), submits to `updateCandidate`, redirects back to `/candidates/[id]`.
5. **Candidate profile** (`/candidates/[id]`) — add an "Edit" link to the new edit page.

## Testing

Same pattern as the rest of the app: `updateOpening`/`updateCandidate` get a throwaway `scripts/verify-*.ts` script run against the live Supabase project (dynamic-import-after-dotenv pattern, per the existing convention), and the new/changed pages get verified live in a browser — fill the edit form, submit, confirm the change persisted and displays correctly.
