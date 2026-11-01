-- Adds Before/After resolution-proof columns. Run in Supabase → SQL Editor.
alter table public.issues
  add column if not exists after_image_url text,
  add column if not exists resolution_verified boolean,
  add column if not exists resolution_confidence numeric,
  add column if not exists resolution_note text;
