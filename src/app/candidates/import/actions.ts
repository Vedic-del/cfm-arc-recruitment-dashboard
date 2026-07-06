'use server';

import { bulkCreateCandidates, getCandidateIdentifiers } from '@/lib/db/candidates';
import type { CreateCandidateInput } from '@/lib/db/candidates';
import { groqChatCompletion } from '@/lib/groqClient';
import { revalidatePath } from 'next/cache';
import { IMPORT_FIELDS, VALID_KEYS, NUMERIC_KEYS, type ImportRowInput, type ImportSummary } from './fields';

export async function suggestColumnMappingAction(
  headers: string[],
  sampleRows: string[][]
): Promise<Record<string, string>> {
  const empty: Record<string, string> = {};
  for (const h of headers) empty[h] = 'ignore';
  if (headers.length === 0) return empty;

  const fieldList = IMPORT_FIELDS.map((f) => `- ${f.key} (${f.label})`).join('\n');
  const sample = sampleRows
    .slice(0, 4)
    .map((row) => headers.map((h, i) => `${h}=${row[i] ?? ''}`).join(' | '))
    .join('\n');

  const prompt = `You are helping import a recruitment spreadsheet. Map each spreadsheet column to one of our candidate fields, or "ignore" if none fit.

Our candidate fields:
${fieldList}

Spreadsheet columns: ${JSON.stringify(headers)}

Sample rows:
${sample}

Respond with ONLY a JSON object mapping each exact column header to a field key or "ignore". Every header must appear as a key. No markdown, no code fences. Example: {"Candidate Name":"name","CTC":"current_salary","Random Col":"ignore"}`;

  try {
    const raw = await groqChatCompletion(prompt);
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return empty;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const result: Record<string, string> = {};
    const usedNonRepeatable = new Set<string>();
    for (const h of headers) {
      const val = parsed[h];
      if (typeof val === 'string' && VALID_KEYS.has(val) && !usedNonRepeatable.has(val)) {
        result[h] = val;
        // A single field shouldn't be mapped from two columns — keep the first.
        usedNonRepeatable.add(val);
      } else {
        result[h] = 'ignore';
      }
    }
    return result;
  } catch {
    return empty;
  }
}

function normalize(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}

export async function bulkImportCandidatesAction(
  rows: ImportRowInput[],
  openingId: string | null,
  skipDuplicates: boolean
): Promise<ImportSummary> {
  const existing = await getCandidateIdentifiers();
  const existingEmails = new Set(existing.map((e) => normalize(e.email)).filter(Boolean));
  const existingPhones = new Set(existing.map((e) => normalize(e.phone)).filter(Boolean));
  const existingNames = new Set(existing.map((e) => normalize(e.name)).filter(Boolean));

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const seenNames = new Set<string>();

  const toCreate: CreateCandidateInput[] = [];
  const duplicateNames: string[] = [];
  let skippedDuplicates = 0;
  let skippedEmpty = 0;

  for (const row of rows) {
    const name = (row.name ?? '').trim();
    if (!name) {
      skippedEmpty += 1;
      continue;
    }

    const email = normalize(row.email);
    const phone = normalize(row.phone);
    const nameKey = normalize(name);

    const isDuplicate =
      (email && (existingEmails.has(email) || seenEmails.has(email))) ||
      (phone && (existingPhones.has(phone) || seenPhones.has(phone))) ||
      (!email && !phone && (existingNames.has(nameKey) || seenNames.has(nameKey)));

    if (isDuplicate && skipDuplicates) {
      skippedDuplicates += 1;
      duplicateNames.push(name);
      continue;
    }

    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    seenNames.add(nameKey);

    const input: CreateCandidateInput = { name };
    const writable = input as unknown as Record<string, unknown>;
    for (const field of IMPORT_FIELDS) {
      if (field.key === 'name') continue;
      const raw = (row[field.key] ?? '').trim();
      if (!raw) continue;
      if (NUMERIC_KEYS.has(field.key)) {
        const num = Number(raw.replace(/[^0-9.]/g, ''));
        if (Number.isFinite(num) && num > 0) {
          writable[field.key] = num;
        }
      } else {
        writable[field.key] = raw;
      }
    }
    toCreate.push(input);
  }

  const result = await bulkCreateCandidates(toCreate, openingId ?? undefined);

  revalidatePath('/candidates');
  if (openingId) revalidatePath(`/openings/${openingId}`);
  revalidatePath('/');

  return {
    created: result.created,
    skippedDuplicates,
    skippedEmpty,
    duplicateNames: duplicateNames.slice(0, 20),
    linkedToOpening: result.linkedToOpening,
  };
}
