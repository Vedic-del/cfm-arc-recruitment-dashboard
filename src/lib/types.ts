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
