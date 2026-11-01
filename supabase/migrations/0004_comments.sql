-- Community discussion threads on issues. Run in Supabase → SQL Editor.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'Citizen',
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_issue_idx on public.comments(issue_id);

alter table public.comments enable row level security;
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select using (true);
drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments for insert to authenticated with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.comments;
