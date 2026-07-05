# Resume Extraction + JD Match Scoring — Design

**Company:** CFM Asset Reconstruction Company
**Date:** 2026-07-05
**Status:** Approved for build

## Problem

Resumes are currently stored as PDF files in Supabase Storage (`resumes` bucket, `resume_path` on `candidates`). The user has explicit possession of the physical CVs already and does not want them stored in the app — only enough extracted information to support AI-driven matching against a role's Job Description (added in the prior spec). Separately, once a candidate has extracted resume data and an opening has a JD, there's no way to see how well the two match without manually reading both.

## Goals

- Resume upload no longer stores the file. Instead, it extracts text (PDF/DOCX) and asks an LLM (Groq, free tier) to produce a structured summary useful for matching, stored on the candidate.
- A "Match against JD" action computes and stores a 0–100 fit score plus a short rationale for a specific candidate-opening pair, on demand (not automatically on every page load — bounded, explicit Groq usage).

## Non-goals

- Bulk spreadsheet import (separate spec, built next, reuses the Groq client this spec introduces).
- Automatic/background scoring of every candidate against every opening — scoring is triggered per pair, by the user.
- Deleting already-uploaded resume files from the existing `resumes` Storage bucket/policies — those stay in place for any historical data; this spec only changes behavior for new uploads going forward.
- `.doc` (legacy binary Word) support — dropped from accepted file types since free parsing libraries don't realistically handle it. Accepted types become PDF and `.docx` only.

## Data model changes

- `candidates.resume_summary` (text, nullable) — the LLM-produced structured summary (skills, years of experience mentioned, education, notable employers, plain-text overview), stored as one text blob (not further normalized into columns — YAGNI, a text field the matching prompt reads is sufficient).
- `candidate_openings.match_score` (int, nullable) — 0–100.
- `candidate_openings.match_rationale` (text, nullable) — short explanation of the score.
- `resume_path`/`resume_upload`/`getResumeUrl` on `candidates.ts` and the `resumes` bucket/policies are left in the schema as-is (untouched) for backward compatibility with any existing rows — just no longer written to by the candidate-creation flow after this spec.

## Architecture

- New `src/lib/groqClient.ts` — thin wrapper around Groq's chat completions endpoint (OpenAI-compatible REST API), reading `GROQ_API_KEY` (server-only env var, already added to `.env.local`/`.env.example`, not `NEXT_PUBLIC_`). Model: `llama-3.1-8b-instant` (fast, free-tier, confirmed working).
- New `src/lib/resumeParsing.ts` — extracts raw text from an uploaded `File`: PDF via `pdf-parse`, DOCX via `mammoth` (both free npm packages, no new paid services). Unsupported file types return `null` text rather than throwing — extraction is best-effort, never blocks candidate creation.
- `src/app/candidates/new/actions.ts` changes: when a resume file is attached, extract its text, send to Groq for structured summarization, store the result in `resume_summary`. Do NOT call `uploadResume`/Storage for new candidates. If text extraction fails or returns nothing usable, `resume_summary` stays null and candidate creation still succeeds (never block the core CRUD flow on the AI step failing).
- New data-layer functions: `src/lib/db/candidates.ts` gains nothing new (the create/update functions already accept arbitrary fields via their input types — `resume_summary` gets added to `CreateCandidateInput`). `src/lib/db/pipeline.ts` gains `scoreMatch(candidateOpeningId: string): Promise<{ score: number; rationale: string }>` — fetches the candidate's `resume_summary` and the opening's `description` via the existing join, sends both to Groq with a scoring prompt, stores `match_score`/`match_rationale` on the `candidate_openings` row, returns the result.
- UI: the opening's pipeline board (kanban cards) and the candidate profile page both show the match score when present (a numeric badge, color-scaled: red <40, amber 40–70, green >70) with the rationale as a tooltip/expandable text, and a "Match against JD" button to trigger scoring (disabled/hidden if the candidate has no `resume_summary` or the opening has no `description` — nothing to compare).

## Error handling

- Groq API failures (rate limit, timeout, malformed response) during resume summarization: caught, logged server-side, `resume_summary` stays null — candidate creation proceeds normally. The user isn't blocked from adding a candidate just because the AI step had a hiccup.
- Groq failures during on-demand match scoring: surfaced as a visible error message where the button was clicked (consistent with the existing inline-error pattern already used in `PipelineBoard.tsx` for stage/scorecard actions) — this is a user-initiated action, so the user should see it failed and can retry.
- Missing prerequisites (no resume summary, no JD) for scoring: the "Match against JD" control is disabled with an explanatory hint rather than allowed to fail after clicking.

## Testing

Same pattern as the rest of the app: `resumeParsing.ts`'s pure PDF/DOCX-to-text extraction gets unit tests with small real sample files (following the `pipelineLogic.ts` precedent of testing pure logic). `groqClient.ts` and the data-layer scoring function are verified live against the real Groq API and real Supabase project via throwaway scripts, and the UI is verified live in a browser (upload a real resume, confirm a summary is produced and no file lands in Storage; trigger a match score, confirm it's stored and displayed).
