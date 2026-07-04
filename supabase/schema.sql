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
