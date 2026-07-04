# HR Recruitment Dashboard — Phase 1 Design

**Company:** CFM Asset Reconstruction Company
**Requested by:** Chief of Staff to Deputy CEO
**Date:** 2026-07-04
**Status:** Approved for build (Phase 1)

## Problem

Recruitment tracking is currently maintained via scattered Excel sheets. There is no
single source of truth for: which roles are open, where each candidate sits in the
pipeline, how long candidates have been stuck at a stage, historical candidates who
were previously sourced/rejected, or manager interview feedback. This makes it
impossible for management or HR to see recruitment health at a glance.

## Goals (Phase 1)

- Single, always-current view of all openings and their pipelines.
- Historical repository of every candidate ever sourced (never deleted), searchable.
- Automatic tracking of time-in-stage and time-to-fill — no manual calculation.
- Formalized manager feedback: a shareable scorecard link per candidate/round,
  no login required for managers.
- Accessible from any device/network (home, office) via a single URL.
- Zero/near-zero cost.

## Explicit non-goals (Phase 1 — deferred to Phase 2)

- AI resume parsing/ranking against a JD (Groq API).
- AI-driven resurfacing of historical candidates against new openings.
- Login/auth and role-based permissions (deliberately deferred; app is open-link
  for now — see Security note below).
- JD generation.

## Architecture

- **Frontend/app:** Next.js, deployed on Vercel (free tier).
- **Database + file storage:** Supabase (Postgres + Storage, free tier) for resume
  files (PDF/DOCX).
- **Access:** No authentication. Anyone with the URL can view/edit. Acceptable for
  Phase 1 per explicit decision; revisit if the link circulates beyond intended
  users, since candidate salary/PII is in scope.

## Data model

**openings**
- title, department, level, hiring_manager, positions_count, date_opened,
  priority (urgent/normal), status (open/on_hold/closed/filled), target_close_date

**candidates**
- name, phone, email, location, current_employer, current_designation,
  years_experience_total, years_experience_relevant, current_salary,
  expected_salary, notice_period, source, resume_file, tags/notes
- Candidates are never deleted — rejected/dropped candidates remain searchable
  in the historical repository.

**candidate_openings** (join table — a candidate can be linked to multiple
openings over time, e.g. reconsidered for a different role later)
- candidate_id, opening_id, current_stage, created_at

**pipeline_events** (append-only history, one row per stage transition)
- candidate_opening_id, stage, entered_at
- Stages: Sourced → Screening → Round 1 (Manager) → Round 2 (Manager, optional/
  skippable) → HR/Offer Discussion → Offer → Joined / Rejected / Dropped

**scorecards**
- candidate_opening_id, stage, unique_link_token, score, comments,
  submitted_at (null until manager submits)

## Core screens

1. **Dashboard** — openings by status; candidate counts per stage across all
   openings; "stuck" candidates (default threshold: 7 days in current stage,
   configurable); average time-to-fill; average time-in-stage per stage
   (surfaces bottlenecks).
2. **Openings list/board** — filterable by status/department; click into an
   opening to see its pipeline as a kanban board (columns = stages, cards =
   candidates).
3. **Candidate profile** — full fields, resume file, linked opening(s), full
   stage history, all scorecards.
4. **Add candidate / Add opening** — simple forms.
5. **Historical repository/search** — all candidates ever added, filterable by
   experience/salary band/tags/source, for manual reuse today and AI-driven
   reuse in Phase 2.

## Manager scorecard flow

1. From a candidate's pipeline card, generate a scorecard link for the current
   round (unique token per candidate+round).
2. Link is sent manually (WhatsApp/email) — sending is not automated in Phase 1.
3. Manager opens the link (no login), sees candidate name/role, a score field,
   and a comments box.
4. On submit, the scorecard is saved and immediately visible on the dashboard.

## Business logic

- **Time to fill** = date an opening is marked filled − date_opened.
- **Stuck flag** = current stage's entered_at is more than the configurable
  threshold (default 7 days) in the past.
- **Time-in-stage average** = computed per stage across all candidates who have
  passed through it, from pipeline_events timestamps.

## Edge cases

- Candidate linked to multiple openings: each opening gets its own independent
  pipeline/history via candidate_openings.
- Rejected/dropped candidates are retained, not deleted.
- Resume uploads: PDF/DOCX only.
- Reopening a closed opening resets status without losing prior history.

## Testing approach

Once built, verify by running the app locally and walking through real flows in
a browser: add an opening, add a candidate, move a candidate through pipeline
stages, generate and fill a scorecard link, confirm dashboard numbers (stuck
count, time-to-fill, time-in-stage) update correctly. Not just a build/compile
check.

## Requirements from user (when reached during build)

1. Free Supabase account + project → Project URL + API key.
2. Free Vercel account (or Vercel CLI login on this machine) for deployment.
3. (Phase 2 only) Free Groq API key.

## Phase 2 (not designed yet, noted for continuity)

- AI resume ranking against a JD using Groq API.
- AI-driven resurfacing of historical candidates for new openings.
- JD creation assistance.
- Possibly: access control/login once usage patterns are clearer.
