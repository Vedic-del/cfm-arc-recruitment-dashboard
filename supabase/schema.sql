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

-- Some Supabase projects auto-enable RLS on new public-schema tables by
-- default. Explicitly disable it here so the "no login, open link" design
-- decision holds regardless of the project's default posture.
alter table openings disable row level security;
alter table candidates disable row level security;
alter table candidate_openings disable row level security;
alter table pipeline_events disable row level security;
alter table scorecards disable row level security;

-- Storage: the `resumes` bucket (created manually via the dashboard, marked
-- public) still enforces RLS on storage.objects for writes even when the
-- bucket is public — "public" only bypasses RLS for reads via the public URL
-- path. Add explicit anon policies so uploads/upserts from the app (no login,
-- per the design decision) work.
create policy "Allow anon uploads to resumes bucket"
on storage.objects for insert
to anon
with check (bucket_id = 'resumes');

create policy "Allow anon updates to resumes bucket"
on storage.objects for update
to anon
using (bucket_id = 'resumes');

create policy "Allow anon reads on resumes bucket"
on storage.objects for select
to anon
using (bucket_id = 'resumes');

alter table openings add column description text;

alter table candidates add column resume_summary text;
alter table candidate_openings add column match_score int;
alter table candidate_openings add column match_rationale text;

-- Deleting an opening should remove its pipeline links (candidate_openings
-- rows) and anything hanging off them (pipeline_events, scorecards), but
-- must NOT delete the candidates themselves — they may still be relevant
-- to other openings or just kept on file. Deleting a candidate should
-- likewise remove their pipeline links across all openings, but must not
-- touch other candidates or any openings. None of the FKs below were
-- declared with an explicit ON DELETE behavior originally (default RESTRICT),
-- so this migration swaps them to CASCADE. Looks up each constraint by
-- table+column rather than assuming a name, since these were never named
-- explicitly above.
create or replace function _cascade_fk(p_table text, p_column text, p_ref_table text, p_new_name text) returns void as $$
declare
  conname text;
begin
  select tc.constraint_name into conname
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_name = p_table
    and kcu.column_name = p_column
    and tc.constraint_type = 'FOREIGN KEY';
  if conname is not null then
    execute format('alter table %I drop constraint %I', p_table, conname);
  end if;
  execute format('alter table %I add constraint %I foreign key (%I) references %I(id) on delete cascade', p_table, p_new_name, p_column, p_ref_table);
end;
$$ language plpgsql;

select _cascade_fk('candidate_openings', 'candidate_id', 'candidates', 'candidate_openings_candidate_id_fkey');
select _cascade_fk('candidate_openings', 'opening_id', 'openings', 'candidate_openings_opening_id_fkey');
select _cascade_fk('pipeline_events', 'candidate_opening_id', 'candidate_openings', 'pipeline_events_candidate_opening_id_fkey');
select _cascade_fk('scorecards', 'candidate_opening_id', 'candidate_openings', 'scorecards_candidate_opening_id_fkey');

drop function _cascade_fk(text, text, text, text);
