export const IMPORT_FIELDS = [
  { key: 'name', label: 'Full name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
  { key: 'current_employer', label: 'Current employer' },
  { key: 'current_designation', label: 'Current designation' },
  { key: 'years_experience_total', label: 'Experience (total)' },
  { key: 'years_experience_relevant', label: 'Experience (relevant)' },
  { key: 'current_salary', label: 'Current salary' },
  { key: 'expected_salary', label: 'Expected salary' },
  { key: 'notice_period', label: 'Notice period' },
  { key: 'source', label: 'Source' },
  { key: 'tags', label: 'Tags / notes' },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]['key'];

export const VALID_KEYS = new Set<string>(IMPORT_FIELDS.map((f) => f.key));

export const NUMERIC_KEYS = new Set<string>([
  'years_experience_total',
  'years_experience_relevant',
  'current_salary',
  'expected_salary',
]);

export interface ImportRowInput {
  [key: string]: string;
}

export interface ImportSummary {
  created: number;
  skippedDuplicates: number;
  skippedEmpty: number;
  duplicateNames: string[];
  linkedToOpening: boolean;
}
