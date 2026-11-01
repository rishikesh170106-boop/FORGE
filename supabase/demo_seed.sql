-- Demo Data Seed Script for Community Hero
-- Run this in the Supabase SQL Editor to populate the database with realistic demo data.
-- Note: This will create demo users. They can sign in via OTP if you use these exact emails.

-- 1. Create Demo Users in auth.users
-- This will automatically trigger public.handle_new_user() to create their profiles.
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, is_super_admin)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'xsanchitguptaa+aarav@gmail.com', '', now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Aarav"}', now(), now(), 'authenticated', false),
  ('d2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'xsanchitguptaa+diya@gmail.com', '', now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Diya"}', now(), now(), 'authenticated', false),
  ('c3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'xsanchitguptaa+kabir@gmail.com', '', now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Kabir"}', now(), now(), 'authenticated', false),
  ('a4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'xsanchitguptaa+ananya@gmail.com', '', now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Ananya"}', now(), now(), 'authenticated', false)
ON CONFLICT (id) DO NOTHING;

-- Wait a moment in reality, but SQL runs synchronously.
-- Update the authority user if they already exist, or just insert them if they don't.
-- Since they exist, we just update their role to authority in profiles.
UPDATE public.profiles SET role = 'authority' WHERE id IN (SELECT id FROM auth.users WHERE email = 'xsanchitguptaa@gmail.com');

-- 2. Insert the 13 Issues
-- Assuming images are uploaded to the 'issue-photos' bucket with these exact filenames.
-- To see images, you MUST upload the 14 photos from `demo-photos` into your Supabase Storage bucket `issue-photos`.
INSERT INTO public.issues (id, ref, title, description, category, severity, status, priority, confidence, safety_risk, tags, location, lat, lng, department, sla_hours, advisory, image_url, reporter_id, reporter_name, created_at, updated_at, after_image_url, resolution_verified, resolution_confidence, resolution_note)
VALUES
-- 1 Aarav | pothole | MG Road
('00000000-0000-0000-0000-000000000001', 'ISS-001', 'Deep Pothole on MG Road', 'Deep pothole in the middle of 100ft road, cars swerving dangerously', 'Road', 'High', 'In Progress', 85, 0.95, 'High risk of accidents for two-wheelers', '{"pothole", "hazard", "traffic"}', 'MG Road', 12.9718, 77.6010, 'Public Works Dept', 24, 'Dispatch road repair crew immediately', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/01-pothole.jpg', 'a1111111-1111-1111-1111-111111111111', 'Aarav', now() - interval '3 hours', now(), null, null, null, null),

-- 2 Diya | water leak | Jayanagar
('00000000-0000-0000-0000-000000000002', 'ISS-002', 'Burst Water Pipeline', 'Burst water pipeline flooding the street near the market', 'Water', 'Critical', 'In Progress', 95, 0.98, 'Flooding and severe water wastage', '{"water leak", "flooding", "urgent"}', 'Jayanagar', 12.9250, 77.5938, 'Water Supply Board', 12, 'Send emergency plumbing team to shut off main valve', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/02-water-leak.jpg', 'd2222222-2222-2222-2222-222222222222', 'Diya', now() - interval '1 hour', now(), null, null, null, null),

-- 3 Kabir | streetlight | HSR Layout
('00000000-0000-0000-0000-000000000003', 'ISS-003', 'Dead Streetlights on HSR Layout', 'Five streetlights dead for a week, the stretch is pitch dark at night', 'Electricity', 'High', 'Acknowledged', 75, 0.92, 'Security risk for pedestrians and vehicles', '{"streetlights", "darkness"}', 'HSR Layout', 12.9121, 77.6446, 'Electricity Board', 48, 'Schedule maintenance for streetlight repair', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/03-streetlight.jpg', 'c3333333-3333-3333-3333-333333333333', 'Kabir', now() - interval '5 hours', now(), null, null, null, null),

-- 4 Ananya | garbage | BTM Layout (OVERDUE for escalation demo)
('00000000-0000-0000-0000-000000000004', 'ISS-004', 'Overflowing Garbage near Market', 'Overflowing garbage beside the vegetable market, stray dogs scattering it', 'Garbage', 'Medium', 'Reported', 65, 0.88, 'Health and sanitation hazard', '{"garbage", "stray dogs", "health hazard"}', 'BTM Layout', 12.9165, 77.6101, 'Sanitation Dept', 12, 'Clear garbage and sanitize area', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/04-garbage.jpg', 'a4444444-4444-4444-4444-444444444444', 'Ananya', now() - interval '2 days', now() - interval '2 days', null, null, null, null),

-- 5 Diya | clogged drain | Koramangala
('00000000-0000-0000-0000-000000000005', 'ISS-005', 'Clogged Storm Drain', 'Open storm drain clogged with black water, mosquitoes breeding', 'Water', 'High', 'Reported', 80, 0.90, 'High risk of mosquito-borne diseases', '{"drainage", "health hazard"}', 'Koramangala', 12.9279, 77.6271, 'Water Supply Board', 24, 'Clear blockage in storm drain immediately', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/05-drain.jpg', 'd2222222-2222-2222-2222-222222222222', 'Diya', now() - interval '5 hours', now(), null, null, null, null),

-- 6 Kabir | fallen branch | Malleshwaram
('00000000-0000-0000-0000-000000000006', 'ISS-006', 'Fallen Tree Branch on Footpath', 'Large tree branch fell on the footpath after rain, blocking the path', 'Road', 'Medium', 'Reported', 60, 0.85, 'Trip hazard for pedestrians', '{"fallen tree", "obstruction"}', 'Malleshwaram', 13.0068, 77.5816, 'Parks & Forests Dept', 48, 'Remove fallen branch from footpath', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/06-fallen-tree.jpg', 'c3333333-3333-3333-3333-333333333333', 'Kabir', now() - interval '12 hours', now(), null, null, null, null),

-- 7 Aarav | traffic signal | Indiranagar
('00000000-0000-0000-0000-000000000007', 'ISS-007', 'Traffic Signal Stuck on Red', 'Traffic signal stuck on red at the busy junction, massive jam', 'Road', 'High', 'In Progress', 90, 0.96, 'Major traffic disruption and potential accidents', '{"traffic", "signal failure"}', 'Indiranagar', 12.9783, 77.6408, 'Traffic Police', 12, 'Send traffic wardens to manually direct traffic and repair signal', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/07-traffic-signal.jpg', 'a1111111-1111-1111-1111-111111111111', 'Aarav', now() - interval '30 mins', now(), null, null, null, null),

-- 8 Ananya | stray dogs | Marathahalli
('00000000-0000-0000-0000-000000000008', 'ISS-008', 'Aggressive Stray Dogs Pack', 'Aggressive stray dog pack near the bus stop chasing commuters', 'Others', 'Medium', 'Acknowledged', 70, 0.82, 'Threat to public safety', '{"stray animals", "safety"}', 'Marathahalli', 12.9591, 77.6974, 'Animal Control', 72, 'Dispatch animal control to relocate dogs safely', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/08-stray-dogs.jpg', 'a4444444-4444-4444-4444-444444444444', 'Ananya', now() - interval '1 day', now(), null, null, null, null),

-- 9 Diya | public toilet | Jayanagar
('00000000-0000-0000-0000-000000000009', 'ISS-009', 'Unusable Public Toilet', 'Public toilet block has no water and a broken door, unusable for days', 'Water', 'Low', 'Acknowledged', 40, 0.75, 'Sanitation issue', '{"sanitation", "public facility"}', 'Jayanagar', 12.9250, 77.5938, 'Sanitation Dept', 168, 'Repair door and restore water supply', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/09-public-toilet.jpg', 'd2222222-2222-2222-2222-222222222222', 'Diya', now() - interval '3 days', now(), null, null, null, null),

-- 10 Aarav | footpath stalls | MG Road
('00000000-0000-0000-0000-000000000010', 'ISS-010', 'Footpath Blocked by Vendors', 'Vendors have taken over the whole footpath, pedestrians pushed onto the road', 'Road', 'Medium', 'Reported', 55, 0.89, 'Pedestrians forced onto active traffic lanes', '{"encroachment", "pedestrian safety"}', 'MG Road', 12.9718, 77.6010, 'Traffic Police', 72, 'Clear footpath encroachment', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/10-footpath-vendors.jpg', 'a1111111-1111-1111-1111-111111111111', 'Aarav', now() - interval '4 hours', now(), null, null, null, null),

-- 11 Kabir | potholes | Whitefield (RESOLVED)
('00000000-0000-0000-0000-000000000011', 'ISS-011', 'Cluster of Potholes', 'Cluster of potholes after the monsoon damaging vehicle suspensions', 'Road', 'High', 'Resolved', 82, 0.94, 'High risk of vehicle damage and accidents', '{"potholes", "road damage"}', 'Whitefield', 12.9698, 77.7499, 'Public Works Dept', 48, 'Schedule immediate road patching', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/11-potholes.jpg', 'c3333333-3333-3333-3333-333333333333', 'Kabir', now() - interval '2 days', now(), 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/14-after-clean-road.jpg', true, 0.98, 'AI verified: New asphalt matches the area. Pothole filled successfully.'),

-- 12 Ananya | construction debris | Electronic City
('00000000-0000-0000-0000-000000000012', 'ISS-012', 'Illegal Construction Debris', 'Construction debris dumped illegally in a vacant plot', 'Garbage', 'Medium', 'Reported', 50, 0.85, 'Environmental and aesthetic issue', '{"illegal dumping", "debris"}', 'Electronic City', 12.8452, 77.6601, 'Sanitation Dept', 168, 'Identify source and clear debris', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/12-debris.jpg', 'a4444444-4444-4444-4444-444444444444', 'Ananya', now() - interval '2 days', now(), null, null, null, null),

-- 13 Diya | pothole | MG Road (DUPLICATE of 1)
('00000000-0000-0000-0000-000000000013', 'ISS-013', 'Huge Crater on MG Road', 'Huge crater on MG Road near the junction, two-wheelers losing balance', 'Road', 'High', 'Reported', 80, 0.96, 'Severe hazard for two-wheelers', '{"pothole", "hazard"}', 'MG Road', 12.9719, 77.6011, 'Public Works Dept', 24, 'Mark as duplicate and merge with existing issue', 'https://dhhxqmdsdmypnzlqeixp.supabase.co/storage/v1/object/public/issue-photos/13-pothole-dup.jpg', 'd2222222-2222-2222-2222-222222222222', 'Diya', now() - interval '1 hour', now(), null, null, null, null)
ON CONFLICT (id) DO NOTHING;

-- Update issue 13 to be a duplicate of 1
UPDATE public.issues SET duplicate_of = '00000000-0000-0000-0000-000000000001' WHERE id = '00000000-0000-0000-0000-000000000013';

-- 3. Community Verifications
-- Aarav verifies #2, #5, #6, #9
INSERT INTO public.verifications (issue_id, user_id) VALUES
('00000000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111'),
('00000000-0000-0000-0000-000000000005', 'a1111111-1111-1111-1111-111111111111'),
('00000000-0000-0000-0000-000000000006', 'a1111111-1111-1111-1111-111111111111'),
('00000000-0000-0000-0000-000000000009', 'a1111111-1111-1111-1111-111111111111')
ON CONFLICT (issue_id, user_id) DO NOTHING;

-- Diya verifies #1, #3, #7, #11
INSERT INTO public.verifications (issue_id, user_id) VALUES
('00000000-0000-0000-0000-000000000001', 'd2222222-2222-2222-2222-222222222222'),
('00000000-0000-0000-0000-000000000003', 'd2222222-2222-2222-2222-222222222222'),
('00000000-0000-0000-0000-000000000007', 'd2222222-2222-2222-2222-222222222222'),
('00000000-0000-0000-0000-000000000011', 'd2222222-2222-2222-2222-222222222222')
ON CONFLICT (issue_id, user_id) DO NOTHING;

-- Kabir verifies #1, #4, #8, #10
INSERT INTO public.verifications (issue_id, user_id) VALUES
('00000000-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333'),
('00000000-0000-0000-0000-000000000004', 'c3333333-3333-3333-3333-333333333333'),
('00000000-0000-0000-0000-000000000008', 'c3333333-3333-3333-3333-333333333333'),
('00000000-0000-0000-0000-000000000010', 'c3333333-3333-3333-3333-333333333333')
ON CONFLICT (issue_id, user_id) DO NOTHING;

-- Ananya verifies #1, #2, #13
INSERT INTO public.verifications (issue_id, user_id) VALUES
('00000000-0000-0000-0000-000000000001', 'a4444444-4444-4444-4444-444444444444'),
('00000000-0000-0000-0000-000000000002', 'a4444444-4444-4444-4444-444444444444'),
('00000000-0000-0000-0000-000000000013', 'a4444444-4444-4444-4444-444444444444')
ON CONFLICT (issue_id, user_id) DO NOTHING;

-- 4. Discussions / Comments
INSERT INTO public.comments (issue_id, user_id, author_name, body) VALUES
('00000000-0000-0000-0000-000000000001', 'd2222222-2222-2222-2222-222222222222', 'Diya', 'This has been here for weeks, please prioritise!'),
('00000000-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'Kabir', 'Confirmed, my tyre got damaged here yesterday.'),
('00000000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'Aarav', 'Water is reaching the shops now, someone needs to come fast.');

-- 5. Timeline Events
-- Simulate some timeline events for the resolved and in progress ones
INSERT INTO public.timeline_events (issue_id, status, note, actor, at) VALUES
('00000000-0000-0000-0000-000000000011', 'Reported', 'Issue submitted successfully', 'Kabir', now() - interval '2 days'),
('00000000-0000-0000-0000-000000000011', 'In Progress', 'Assigned to Public Works Dept for immediate action', 'Authority', now() - interval '1 day'),
('00000000-0000-0000-0000-000000000011', 'Resolved', 'Pothole filled and road repaired', 'Authority', now() - interval '2 hours'),
('00000000-0000-0000-0000-000000000001', 'Reported', 'Issue submitted successfully', 'Aarav', now() - interval '3 hours'),
('00000000-0000-0000-0000-000000000001', 'In Progress', 'Crew dispatched to assess the hazard', 'Authority', now() - interval '1 hour');
