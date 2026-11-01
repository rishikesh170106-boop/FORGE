-- =============================================================================
-- COMMUNITY HERO — COMPLETE MASTER SUPABASE DATABASE SETUP
-- Run this entire script in Supabase Dashboard → SQL Editor (click "Run")
-- Project: https://supabase.com/dashboard/project/dcjnnkutajnxhqpswyqz/sql/new
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Citizen',
  avatar text NOT NULL DEFAULT '🧑',
  role text NOT NULL DEFAULT 'citizen',
  department_id text,
  ward_id text,
  badge_number text,
  designation text,
  is_demo boolean DEFAULT false,
  points int NOT NULL DEFAULT 0,
  reports int NOT NULL DEFAULT 0,
  verifications int NOT NULL DEFAULT 0,
  resolved_impact int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name',
             new.raw_user_meta_data->>'full_name',
             split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;
  RETURN new;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. WARDS TABLE
CREATE TABLE IF NOT EXISTS public.wards (
  id text PRIMARY KEY,
  name text NOT NULL,
  zone text NOT NULL,
  lat double precision,
  lng double precision,
  supervisor_name text,
  contact_number text,
  created_at timestamptz DEFAULT now()
);

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
  id text PRIMARY KEY,
  name text NOT NULL,
  head_name text,
  contact_email text,
  sla_hours int NOT NULL DEFAULT 48,
  created_at timestamptz DEFAULT now()
);

-- 4. ISSUES TABLE
CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  severity text NOT NULL CHECK (severity in ('Low','Medium','High','Critical')),
  status text NOT NULL DEFAULT 'Reported',
  detailed_status text NOT NULL DEFAULT 'SUBMITTED',
  priority int NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0,
  safety_risk text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  location text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  department text NOT NULL DEFAULT '',
  department_id text,
  ward_id text,
  ward_name text,
  sla_hours int NOT NULL DEFAULT 72,
  resolution_deadline timestamptz,
  work_order_id text,
  assigned_officer_id text,
  assigned_officer_name text,
  assigned_worker_id text,
  assigned_worker_name text,
  advisory text NOT NULL DEFAULT '',
  image_url text,
  after_image_url text,
  resolution_verified boolean,
  resolution_confidence numeric,
  resolution_note text,
  citizen_confirmed boolean,
  citizen_feedback text,
  escalated boolean NOT NULL DEFAULT false,
  disputes int NOT NULL DEFAULT 0,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name text NOT NULL DEFAULT 'Citizen',
  verifications int NOT NULL DEFAULT 0,
  duplicate_of uuid REFERENCES public.issues(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS issues_status_idx ON public.issues(status);
CREATE INDEX IF NOT EXISTS issues_category_idx ON public.issues(category);
CREATE INDEX IF NOT EXISTS issues_created_idx ON public.issues(created_at desc);
CREATE INDEX IF NOT EXISTS issues_reporter_idx ON public.issues(reporter_id);

-- 5. TIMELINE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT '',
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS timeline_issue_idx ON public.timeline_events(issue_id);

-- 6. COMMUNITY VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issue_id, user_id)
);

-- 7. WORK ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.work_orders (
  id text PRIMARY KEY,
  complaint_id text NOT NULL,
  department_id text,
  department_name text,
  officer_id text,
  officer_name text,
  worker_id text,
  worker_name text,
  status text NOT NULL DEFAULT 'Assigned',
  instructions text,
  deadline timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completion_notes text,
  before_photo_url text,
  after_photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. AI VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.ai_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id text NOT NULL,
  work_order_id text,
  original_photo_url text,
  after_photo_url text,
  issue_identified text,
  is_resolved boolean,
  remaining_damage text,
  confidence numeric,
  explanation text,
  recommendation text,
  created_at timestamptz DEFAULT now()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id text NOT NULL,
  action text NOT NULL,
  actor_role text NOT NULL,
  actor_name text NOT NULL,
  actor_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  complaint_id text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 11. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Citizen',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read of all civic issues, wards, departments, work orders, audit logs
CREATE POLICY "allow_all_read_issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "allow_all_read_profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "allow_all_read_wards" ON public.wards FOR SELECT USING (true);
CREATE POLICY "allow_all_read_departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "allow_all_read_work_orders" ON public.work_orders FOR SELECT USING (true);
CREATE POLICY "allow_all_read_timeline" ON public.timeline_events FOR SELECT USING (true);
CREATE POLICY "allow_all_read_audit" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "allow_all_read_notifications" ON public.notifications FOR SELECT USING (true);

-- Allow authenticated users & service role to insert/update
CREATE POLICY "allow_insert_issues" ON public.issues FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_issues" ON public.issues FOR UPDATE USING (true);
CREATE POLICY "allow_insert_work_orders" ON public.work_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_work_orders" ON public.work_orders FOR UPDATE USING (true);
CREATE POLICY "allow_insert_timeline" ON public.timeline_events FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_insert_audit" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_insert_notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_notifications" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "allow_storage_read" ON storage.objects FOR SELECT USING (bucket_id = 'issue-photos');
CREATE POLICY "allow_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-photos');

-- 14. SEED INITIAL WARDS & DEPARTMENTS
INSERT INTO public.wards (id, name, zone, lat, lng, supervisor_name, contact_number) VALUES
  ('ward-101', 'Indiranagar', 'East Zone', 12.9784, 77.6408, 'K. N. Murthy', '+91 80 2297 5601'),
  ('ward-102', 'Koramangala', 'South Zone', 12.9352, 77.6245, 'V. Venkatesh', '+91 80 2297 5602'),
  ('ward-103', 'Whitefield', 'Mahadevapura Zone', 12.9698, 77.7499, 'P. Srinivas', '+91 80 2297 5603'),
  ('ward-104', 'HSR Layout', 'Bommanahalli Zone', 12.9121, 77.6446, 'S. Jayaram', '+91 80 2297 5604'),
  ('ward-105', 'Jayanagar', 'South Zone', 12.9308, 77.5838, 'M. Nagaraj', '+91 80 2297 5605'),
  ('ward-106', 'Malleshwaram', 'West Zone', 12.9982, 77.5704, 'R. Chandrashekar', '+91 80 2297 5606')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, head_name, contact_email, sla_hours) VALUES
  ('dept-road', 'Road Maintenance', 'Chief Engineer (Roads)', 'roads@city.gov', 24),
  ('dept-water', 'Water Supply', 'Executive Engineer (Water Supply)', 'water@city.gov', 12),
  ('dept-drain', 'Drainage', 'Superintending Engineer (SWD)', 'drainage@city.gov', 18),
  ('dept-sanit', 'Sanitation', 'Joint Commissioner (Solid Waste)', 'sanitation@city.gov', 8),
  ('dept-elec', 'Electrical Department', 'Superintending Engineer (Elec)', 'electrical@city.gov', 12),
  ('dept-pwd', 'Public Works', 'Chief Engineer (General Works)', 'publicworks@city.gov', 48),
  ('dept-ctrl', 'Municipal Control Desk', 'Municipal Commissioner', 'admin@city.gov', 6)
ON CONFLICT (id) DO NOTHING;

