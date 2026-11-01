-- Community consensus: neighbours can dispute a report as well as verify it.
-- 3+ disputes flags the issue for community review and damps its priority.

alter table public.issues
  add column if not exists disputes int not null default 0;
