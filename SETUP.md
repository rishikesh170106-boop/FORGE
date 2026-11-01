# Setup — Supabase & OpenStreetMap

The application uses **OpenStreetMap, Leaflet, and Nominatim** for full mapping, search, and reverse geocoding with **zero API keys, zero Google Cloud setup, and zero billing requirements**.

## 1. Supabase (auth + database + realtime + storage + PostGIS)

1. Create a project at https://supabase.com → **New project**.
2. **SQL Editor** → run, in order:
   - `supabase/migrations/0001_init.sql`
   - `0002_resolution.sql` (Before/After proof columns)
   - `0003_escalation.sql` (auto-escalation `escalated` flag)
   - `0004_comments.sql` (community discussion threads)
   - `0005_postgis_pgvector.sql` (PostGIS spatial indexes & radius queries)
   - `0006_disputes.sql` (community consensus)
3. **Settings → API** → copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`
4. **Email OTP** (6-digit code sign-in — passwordless):
   - Authentication → **Providers → Email** → make sure **Email** is enabled.
   - Authentication → **Email Templates → Magic Link** → ensure the body includes
     the code token `{{ .Token }}` so users receive a 6-digit OTP (not just a link).
     A minimal template: `Your Community Hero code is: {{ .Token }}`
5. Storage bucket `issue-photos` is created by migration 0001 (public read).
6. Demo authority: click **“Enter as demo authority”** on `/login`.

## 2. Open-Source Geospatial Stack (No configuration required)

* **Map Rendering:** Leaflet + OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
* **Location Search & Autocomplete:** OpenStreetMap Nominatim search via `/api/geocode/search`.
* **Reverse Geocoding:** OpenStreetMap Nominatim reverse lookup via `/api/geocode/reverse` with automatic offline locality fallback.
* **GPS Detection:** HTML5 Browser Geolocation API.
* **Spatial Distance Queries:** Supabase + PostGIS (`location_geom` column + GiST spatial index).

## 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 4. Gemini model & quota

Defaults to `gemini-2.5-flash-lite` (generous free-tier limits). Set `GEMINI_API_KEY` in `.env.local` to enable the full multimodal agent and AI triage loop.
