-- Codebase Explainer schema (free/local retrieval + Gemini)
create table if not exists code_chunks (
  id uuid primary key default gen_random_uuid(),
  repo_id text not null,
  file_path text not null,
  content text not null,
  start_line int,
  end_line int,
  created_at timestamptz default now()
);
create index if not exists code_chunks_repo_idx on code_chunks (repo_id);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  github_id text unique not null,
  username text not null,
  avatar_url text,
  github_access_token text,
  created_at timestamptz default now()
);
alter table users add column if not exists is_owner boolean not null default false;
alter table users add column if not exists credits integer not null default 0;

create table if not exists repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  repo_id text not null,
  display_name text not null,
  source_type text not null default 'git',
  visibility text default 'public',
  files_processed int,
  chunks_stored int,
  created_at timestamptz default now(),
  last_opened_at timestamptz default now()
);
create index if not exists repos_user_idx on repos (user_id);
create unique index if not exists repos_user_repo_idx on repos (user_id, repo_id);

create table if not exists file_dependencies (
  id uuid primary key default gen_random_uuid(),
  repo_id text not null,
  source_file text not null,
  target_file text not null,
  created_at timestamptz default now()
);

create table if not exists file_summaries (
  id uuid primary key default gen_random_uuid(),
  repo_id text not null,
  file_path text not null,
  description text,
  node_type text,
  created_at timestamptz default now()
);
create unique index if not exists file_summaries_repo_file_idx on file_summaries (repo_id, file_path);

create table if not exists user_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  usage_date date not null default current_date,
  repo_analyses integer not null default 0,
  ai_questions integer not null default 0,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, usage_date)
);
create index if not exists user_usage_user_date_idx on user_usage(user_id, usage_date);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('purchase','usage','refund','bonus')),
  amount integer not null,
  description text,
  payment_id text,
  created_at timestamptz not null default now()
);
create index if not exists credit_transactions_user_idx on credit_transactions(user_id, created_at desc);
