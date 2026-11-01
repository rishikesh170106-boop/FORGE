-- Adds the auto-escalation flag for SLA-breached issues. Run in Supabase → SQL Editor.
alter table public.issues
  add column if not exists escalated boolean not null default false;
