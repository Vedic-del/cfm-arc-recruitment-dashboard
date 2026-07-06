/**
 * One-time ETL for the legacy "Copy of tracker recruitment.xlsx".
 * Dry run by default (prints a summary + samples, no DB writes).
 * Set RUN=1 to actually insert into Supabase.
 *
 * Each role-named sheet becomes a (closed) Opening; its rows become candidates
 * linked at a stage inferred from the status/review text. Month sheets
 * (June/July/Aug/Oct) are imported to the repository only. Sheet2 is skipped.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

const FILE = 'C:/Users/Acer/Downloads/Copy of tracker recruitment.xlsx';
const DO_WRITE = process.env.RUN === '1';

const REPO_ONLY = new Set(['june', 'july', 'august', 'oct']);
const SKIP = new Set(['sheet2']);

const NAME_FIX: Record<string, string> = {
  'jr officer': 'Jr Officer',
  'cs jnior': 'CS Junior',
  acquisation: 'Acquisition',
  'mid legal': 'Mid Legal',
  'pune legal': 'Pune Legal',
  'business head': 'Business Head',
  'recovery ahmedabad': 'Recovery Ahmedabad',
  'investment bankinng cfmpl': 'Investment Banking (CFMPL)',
  chennai: 'Chennai',
  hr: 'HR',
  it: 'IT',
  ea: 'EA',
  cfo: 'CFO',
  cco: 'CCO',
  cro: 'CRO',
  cs: 'CS',
  l2: 'L2',
};

function titleCase(s: string): string {
  return s.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function roleName(sheet: string): string {
  const key = sheet.trim().toLowerCase();
  return NAME_FIX[key] ?? titleCase(sheet);
}

function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ')
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Field =
  | 'name'
  | 'phone'
  | 'email'
  | 'location'
  | 'preferred_location'
  | 'current_employer'
  | 'current_designation'
  | 'years_experience_total'
  | 'years_experience_relevant'
  | 'current_salary'
  | 'expected_salary'
  | 'notice_period'
  | 'qualification'
  | 'consultant'
  | 'status'
  | 'position'
  | 'ignore';

const SYNONYMS: Record<string, Field> = {};
const add = (f: Field, ...keys: string[]) => keys.forEach((k) => (SYNONYMS[k] = f));
add('name', 'candidate name', 'candidates name', 'name', 'candidate');
add('phone', 'contact number', 'contact no', 'cell no', 'cell', 'mobile', 'mobile no', 'contact', 'phone', "candidate's contact details", 'contact details');
add('email', 'email id', 'email', 'e mail', 'mail id');
add('location', 'current location', 'location');
add('preferred_location', 'preferred location');
add('current_employer', 'current org', 'current organisation', 'current organization', 'organisation', 'organization', 'current company', 'company');
add('current_designation', 'current designation', 'designation', 'current desig', 'current position', 'position held');
add('position', 'position', 'positions');
add('years_experience_total', 'total exp', 'total experience', 'total yrs exp', 'total years exp', 'experience', 'current work experience', 'work experience', 'exp');
add('years_experience_relevant', 'relevant exp', 'relevant experience');
add('current_salary', 'current ctc', 'current salary', 'ctc', 'present ctc');
add('expected_salary', 'expected ctc', 'expected', 'expected salary', 'salary expectations');
add('notice_period', 'notice period', 'notice', 'np');
add('qualification', 'qualification', 'qualifications', 'highest educational qualification', 'highest education qualification', 'education');
add('consultant', 'consultant', 'consultancy', 'consultant source', 'source', 'consultant/source');
add('status', 'review', 'comments', 'status', 'remarks', 'update', 'reason for change', 'comment');
add('ignore', 'sr no', 'sr', 's no', 'sno', 'age', 'dob', 'date of birth', 'date', 'date sent', 'date of cv', 'interviewed by', 'positions joining', 'doj');

const HEADER_TOKENS = new Set(Object.keys(SYNONYMS));
function knownField(cell: unknown): Field | null {
  return SYNONYMS[norm(cell)] ?? null;
}

const STATUS_WORDS = /reject|hold|shortlist|ok to hire|selected|not selected|backed out|cv rej|awaiting|not relevant|not suitable|duplicate|offer|scheduled|pipeline|fitment|declined|not taken/;

function looksLikeName(v: string): boolean {
  const t = v.trim();
  if (t.length < 3) return false;
  if (HEADER_TOKENS.has(norm(t))) return false;
  if (!/[a-zA-Z]{2,}/.test(t)) return false;
  if (/^\d+([.\-/]\d+)*$/.test(t)) return false; // pure number/date
  if (/^(date|candidate name|organization|designation|status|sr\.? ?no)/i.test(t)) return false;
  return true;
}

function cleanPhone(v: string): string {
  const digits = v.replace(/[^\d]/g, ' ').trim().split(/\s+/).find((d) => d.length >= 10 && d.length <= 13);
  return digits ?? '';
}
function cleanExp(v: string): number | null {
  const m = v.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n < 60 ? n : null;
}
function cleanSalary(v: string): number | null {
  const s = v.toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  if (/lac|lakh|lpa/.test(s)) n *= 100000;
  else if (/per month|month|\/-/.test(s) && n < 500000) n *= 12;
  else if (n < 1000) return null; // bare "30" (a %/junk), not a salary
  return Math.round(n);
}

interface ParsedCandidate {
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
  status: string;
}

function stageFor(status: string): 'Rejected' | 'Dropped' | 'Round 1' | 'Sourced' {
  const s = status.toLowerCase();
  if (/back(ed)? out|not interested|withdraw|withdrew|candidate not sure|dropped/.test(s)) return 'Dropped';
  if (/reject|not selected|not relevant|not suitable|cv rej|declined|not taken/.test(s)) return 'Rejected';
  if (/shortlist|ok to hire|selected|offer|good\b|liked/.test(s)) return 'Round 1';
  return 'Sourced';
}

function parseSheet(sheetName: string, grid: string[][]) {
  // 1. find header row (most known tokens in first 4 rows)
  let headerRow = 0;
  let best = 0;
  for (let r = 0; r < Math.min(4, grid.length); r++) {
    const count = grid[r].filter((c) => knownField(c)).length;
    if (count > best) {
      best = count;
      headerRow = r;
    }
  }
  if (best < 2) return { candidates: [], headerRow, twoRow: false };

  // 2. detect two-row (grouped) header
  const next = grid[headerRow + 1] ?? [];
  const nextKnown = next.filter((c) => knownField(c)).length;
  const twoRow = nextKnown >= 3;
  const eff: string[] = [];
  const width = Math.max(grid[headerRow].length, twoRow ? next.length : 0);
  for (let i = 0; i < width; i++) {
    const top = grid[headerRow][i] ?? '';
    const sub = twoRow ? next[i] ?? '' : '';
    eff[i] = knownField(sub) ? sub : top;
  }
  const dataStart = headerRow + (twoRow ? 2 : 1);

  // 3. column → field map
  const colField: (Field | null)[] = eff.map((h) => knownField(h));
  const nameCol = colField.indexOf('name');
  if (nameCol === -1) return { candidates: [], headerRow, twoRow };

  // 4. leading status column (unnamed col 0/1 whose values look like statuses)
  const statusCols = colField.map((f, i) => (f === 'status' ? i : -1)).filter((i) => i >= 0);
  for (const c of [0, 1]) {
    if (colField[c] || c === nameCol) continue;
    let hits = 0;
    let seen = 0;
    for (let r = dataStart; r < grid.length; r++) {
      const v = String(grid[r][c] ?? '').trim();
      if (!v) continue;
      seen++;
      if (STATUS_WORDS.test(v.toLowerCase())) hits++;
    }
    if (seen >= 3 && hits / seen >= 0.3) statusCols.push(c);
  }

  const get = (row: string[], field: Field): string => {
    const i = colField.indexOf(field);
    return i === -1 ? '' : String(row[i] ?? '').trim();
  };

  const candidates: ParsedCandidate[] = [];
  for (let r = dataStart; r < grid.length; r++) {
    const row = grid[r];
    const name = String(row[nameCol] ?? '').trim();
    if (!looksLikeName(name)) continue;

    const statusText = statusCols
      .map((i) => String(row[i] ?? '').trim())
      .filter(Boolean)
      .join(' | ');

    const qualification = get(row, 'qualification');
    const position = get(row, 'position');
    const expectedRaw = get(row, 'expected_salary');
    const expectedNum = cleanSalary(expectedRaw);

    const tagParts = [
      qualification && `Qual: ${qualification}`,
      REPO_ONLY.has(sheetName.trim().toLowerCase()) && position && `For: ${position}`,
      !expectedNum && expectedRaw && `Expected: ${expectedRaw}`,
      statusText && `Outcome: ${statusText}`,
    ].filter(Boolean) as string[];

    const c: ParsedCandidate = { name: titleCase(name), status: statusText };
    const phone = cleanPhone(get(row, 'phone'));
    const email = get(row, 'email');
    let loc = get(row, 'location');
    const emp = get(row, 'current_employer');
    let desig = get(row, 'current_designation');
    // Several source sheets omit a Designation header, shifting a job title into
    // the Location column. If "location" reads like a title, treat it as one.
    const DESIG = /manager|associate|officer|executive|analyst|secretary|\bhead\b|vice president|\bvp\b|director|engineer|consultant|advocate|\blead\b|specialist|president|counsel|partner|generalist|accountant/i;
    if (loc && DESIG.test(loc)) {
      if (!desig) desig = loc;
      loc = '';
    }
    const expT = cleanExp(get(row, 'years_experience_total'));
    const expR = cleanExp(get(row, 'years_experience_relevant'));
    const cur = cleanSalary(get(row, 'current_salary'));
    const notice = get(row, 'notice_period');
    const consultant = get(row, 'consultant');

    if (phone) c.phone = phone;
    if (/@/.test(email)) c.email = email.split(/[\s,/]+/).find((e) => e.includes('@'));
    if (loc) c.location = loc;
    if (emp) c.current_employer = emp;
    if (desig) c.current_designation = desig;
    if (expT !== null) c.years_experience_total = expT;
    if (expR !== null) c.years_experience_relevant = expR;
    if (cur !== null) c.current_salary = cur;
    if (expectedNum !== null) c.expected_salary = expectedNum;
    if (notice) c.notice_period = notice;
    c.source = consultant || 'Legacy tracker';
    if (tagParts.length) c.tags = tagParts.join(' • ').slice(0, 400);

    candidates.push(c);
  }
  return { candidates, headerRow, twoRow };
}

async function main() {
  const wb = XLSX.read(readFileSync(FILE), { type: 'buffer' });
  const perSheet: { sheet: string; role: string; repoOnly: boolean; candidates: ParsedCandidate[] }[] = [];

  for (const sheet of wb.SheetNames) {
    const key = sheet.trim().toLowerCase();
    if (SKIP.has(key)) continue;
    const grid = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sheet], {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    });
    const { candidates } = parseSheet(sheet, grid);
    perSheet.push({ sheet, role: roleName(sheet), repoOnly: REPO_ONLY.has(key), candidates });
  }

  let total = 0;
  console.log('\n===== DRY RUN SUMMARY =====');
  for (const s of perSheet) {
    total += s.candidates.length;
    const withPhone = s.candidates.filter((c) => c.phone).length;
    const withEmail = s.candidates.filter((c) => c.email).length;
    console.log(
      `${s.repoOnly ? '[repo] ' : '[role] '}${s.role.padEnd(26)} ${String(s.candidates.length).padStart(3)} cands  (${withPhone} phone, ${withEmail} email)`
    );
  }
  console.log(`\nTOTAL candidates: ${total} across ${perSheet.filter((s) => !s.repoOnly).length} roles + ${perSheet.filter((s) => s.repoOnly).length} month logs`);

  // sample from three representative sheets
  for (const name of ['resolution', 'mid legal', 'CFO']) {
    const s = perSheet.find((x) => x.sheet.trim().toLowerCase() === name);
    if (!s) continue;
    console.log(`\n--- sample: ${s.role} ---`);
    s.candidates.slice(0, 3).forEach((c) => console.log(JSON.stringify(c)));
  }

  if (!DO_WRITE) {
    console.log('\n(dry run — set RUN=1 to write to Supabase)');
    return;
  }

  console.log('\n===== WRITING TO SUPABASE =====');
  const { supabase } = await import('../src/lib/supabaseClient');
  const createdCandidateIds: string[] = [];
  const createdOpeningIds: string[] = [];
  // person-level cache so someone interviewed for 2 roles is ONE candidate, 2 links
  const byKey = new Map<string, string>();
  const keyOf = (c: ParsedCandidate) =>
    c.email?.toLowerCase() || c.phone || `name:${c.name.toLowerCase()}`;

  for (const s of perSheet) {
    if (s.candidates.length === 0) continue;
    let openingId: string | null = null;
    if (!s.repoOnly) {
      const { data, error } = await supabase
        .from('openings')
        .insert({ title: s.role, status: 'closed', description: 'Imported from the legacy recruitment tracker (historical interviews).' })
        .select('id')
        .single();
      if (error) {
        console.log('opening insert failed for', s.role, error.message);
        continue;
      }
      openingId = (data as { id: string }).id;
      createdOpeningIds.push(openingId);
    }

    // 1. batch-insert candidates not already created this run
    const newOnes = s.candidates.filter((c) => !byKey.has(keyOf(c)));
    // dedup within this sheet's new set
    const uniqNew: ParsedCandidate[] = [];
    const seenLocal = new Set<string>();
    for (const c of newOnes) {
      const k = keyOf(c);
      if (seenLocal.has(k)) continue;
      seenLocal.add(k);
      uniqNew.push(c);
    }
    if (uniqNew.length) {
      const insertable = uniqNew.map(({ status, ...rest }) => {
        void status;
        return rest;
      });
      const { data, error } = await supabase.from('candidates').insert(insertable).select('id');
      if (error) {
        console.log('candidate batch insert failed for', s.role, error.message);
        continue;
      }
      const ids = (data as { id: string }[]).map((r) => r.id);
      uniqNew.forEach((c, i) => {
        byKey.set(keyOf(c), ids[i]);
        createdCandidateIds.push(ids[i]);
      });
    }

    // 2. batch-insert opening links (deduped by candidate+opening), then events
    if (openingId) {
      const linkSeen = new Set<string>();
      const links: { candidate_id: string; opening_id: string; current_stage: string }[] = [];
      for (const c of s.candidates) {
        const cid = byKey.get(keyOf(c));
        if (!cid || linkSeen.has(cid)) continue;
        linkSeen.add(cid);
        links.push({ candidate_id: cid, opening_id: openingId, current_stage: stageFor(c.status) });
      }
      if (links.length) {
        const { data, error } = await supabase.from('candidate_openings').insert(links).select('id');
        if (!error && data) {
          const linkIds = (data as { id: string }[]).map((r) => r.id);
          const events: { candidate_opening_id: string; stage: string }[] = [];
          linkIds.forEach((lid, i) => {
            events.push({ candidate_opening_id: lid, stage: 'Sourced' });
            if (links[i].current_stage !== 'Sourced') {
              events.push({ candidate_opening_id: lid, stage: links[i].current_stage });
            }
          });
          await supabase.from('pipeline_events').insert(events);
        } else if (error) {
          console.log('link batch insert failed for', s.role, error.message);
        }
      }
    }
    console.log(`  ${s.role}: ${uniqNew.length} new candidates`);
  }

  writeFileSync(
    'scripts/legacy-import-ids.json',
    JSON.stringify({ candidateIds: createdCandidateIds, openingIds: createdOpeningIds }, null, 2)
  );
  console.log(`\nDONE. Created ${createdCandidateIds.length} candidates, ${createdOpeningIds.length} openings.`);
  console.log('IDs written to scripts/legacy-import-ids.json (for undo).');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
