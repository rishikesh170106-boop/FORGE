# 🏛️ CIVIC SENSE — Smarter communities. Better cities.

> Turn a photo of a local problem into verified civic action in seconds — with an **autonomous AI agent** doing the triage, routing, and tracking. Fully local SQLite persistence with zero cloud dependency.

Built for modern cities on the problem statement **“CIVIC SENSE — Smarter communities. Better cities.”**

Communities face potholes, water leakages, broken streetlights and waste problems every day. Reporting them is fragmented, opaque and slow. CIVIC SENSE turns every citizen with a phone into a sensor, and an AI agent into the city worker who never sleeps — **identifying, reporting, validating, tracking and resolving** issues through collaboration, data and intelligent automation.

---

## ✨ What makes it different — *real agentic depth*

This isn’t a form with one AI call bolted on. The **Civic Triage Agent** runs a live **function-calling loop on Gemini 2.5 Flash**, and the citizen *watches it think*. For every report the agent autonomously:

1. 👁️ **Sees the photo** — Gemini Vision classifies the issue, severity, tags and safety risk.
2. 🔎 **Checks for duplicates** — calls a tool to find open reports of the same type nearby (geo dedup) so the same pothole isn’t filed ten times — instead duplicates *strengthen* the signal.
3. 🏛️ **Routes to the right department** — calls a tool to look up the responsible municipal body and its SLA.
4. 📊 **Scores priority (0–100)** — blends severity, duplicate count, SLA urgency and safety risk via a tool.
5. 📝 **Files the work order** — drafts a crisp official summary and a warm, plain-language citizen advisory, then files it.

Every tool call and its result is **streamed to the UI step-by-step** (NDJSON), so the agent’s reasoning is fully transparent — not a black box. The whole loop is genuinely orchestrated by the model deciding which tool to call next.

> The agent degrades gracefully: if the API is unavailable, a built-in heuristic classifier and deterministic triage keep the product fully usable.

---

## 🧩 Key features

| Problem-statement feature | In Community Hero |
| --- | --- |
| Image/video-based reporting | 📸 One-tap photo upload / camera capture |
| AI-powered issue categorization | 🤖 Gemini Vision → category, severity, tags, safety risk |
| Geo-location & mapping | 🗺️ Browser GPS + a live interactive city map of every report |
| Community verification | 👍 Neighbours verify issues, boosting priority & trust |
| Real-time issue tracking | ⏱️ Transparent timeline: Reported → Acknowledged → In Progress → Resolved |
| Impact dashboards | 📊 Live KPIs, 7-day trend, category breakdown, hotspots |
| Predictive insights | 🔮 Gemini analyses live data to predict hotspots & recommend actions |
| Gamification | 🏆 Points, levels and a civic-champions leaderboard |
| **Bonus: conversational assistant** | 💬 “Hero Assistant” — a Gemini chatbot grounded in live community data |

### 🚀 Moonshot features — beyond every other civic app

- ⚖️ **AI Council — multi-agent negotiation** — on any issue, three Gemini agents debate live: a **Citizen Advocate** argues the residents' urgency case, a **Resource Allocator** argues from real crew workload (live open-case counts per department), and an **Arbitrator** hands down a binding verdict that re-scores the priority and SLA — streamed turn-by-turn and applied with a full audit trail on the timeline.
- 🚛 **Fleet Watch — passive dashcam crowdsourcing** (`/fleet`) — partner fleet vehicles (delivery bikes, garbage trucks) become roving sensors: upload a dashcam clip, the app samples frames, interpolates GPS along the route, and **Gemini Vision inspects each frame**; confident detections are **auto-filed as geo-tagged work orders** (with geo-dedup against existing reports). Zero citizen effort.
- 📜 **RTI auto-generator** — when an issue breaches its SLA, one click drafts a formal **Right to Information Act, 2005 application** to the department's Public Information Officer — file notings, responsible officer, funds utilised, expected completion — ready to print, email or file.
- 🗺️ **TSP dispatch routing** (`/authority/route`) — the authority console solves the **Traveling Salesperson Problem** (nearest-neighbour + 2-opt) over open issues per department: an ordered crew manifest with ETAs, km/CO₂ saved vs naive dispatch, and a one-tap OpenStreetMap navigation deep link.
- 📈 **City Health Score** — a single 0–100 graded pulse (resolution rate + critical load + turnaround) on the landing page.
- 🖼️ **Viral share cards** — every issue page serves a **dynamic Open Graph image** (`/api/og`) with the live priority meter and a "Fix this!" banner, so shares on WhatsApp/X campaign for the fix; public APIs ship edge-cache headers (`s-maxage`, `stale-while-revalidate`) for embed-scale traffic.

### 🛡️ Trust & safety layer

- 🧭 **Civic Trust Score** — every reporter earns a transparent 0–1 reputation computed live from their track record (reports filed, neighbour corroborations, real resolutions, community disputes). The triage agent shows a *"weighing reporter credibility"* step and blends the score (±6) into the final priority — proven reporters carry more signal, spam carries less. No hidden state, no black box.
- ⚖️ **Community consensus** — verify *and* **dispute**: neighbours who believe a report is wrong or already fixed push back with one tap; 3 disputes flag the issue **"Under community review"** on a public timeline entry and damp its priority.
- 🕶️ **PII privacy shield** — Gemini Vision flags photos containing identifiable faces or licence plates during triage; the record carries a visible privacy badge, the agent never writes identities into the report, and the open-data API already strips reporter PII and images.
- 🧑‍⚖️ **Judge — self-correcting review** — before any work order is filed, a Judge step audits the finished triage (does severity match the danger? is priority consistent? is the advisory accurate?) and applies corrections live in the stream. A deterministic consistency audit always backs the AI up.
- 🙋 **Citizen appeal** — the AI's rejection is never final: if vision can't confirm a civic issue, the citizen can appeal with one tap; the report files at a capped priority with an "Appeal — review" flag in the authority queue, so a human makes the call.

### Advanced AI features
- 🔁 **Before/After resolution proof** — when an authority resolves an issue they upload an “after” photo; **Gemini Vision compares before vs after** and confirms a genuine fix (anti-fraud + accountability).
- 🧠 **Semantic duplicate detection** — **Gemini embeddings** (`gemini-embedding-001`, `SEMANTIC_SIMILARITY`) match recurring reports by *meaning*, not just GPS/category, and auto-link duplicates.
- 📍 **“Issues near me”** — geolocation feed + radius filter on the home and dashboard, ranked by distance.
- 🌐 **Multilingual reporting** — pick a language (English / हिन्दी / ಕನ್ನಡ / தமிழ் / తెలుగు / मराठी / বাংলা) and the agent writes the report title, description and advisory in it.
- 🎙️ **Voice reporting** — dictate the issue with the browser's speech recognition (language-aware), no typing needed.
- 🏛️ **Department accountability scorecards** (`/scorecards`) — public per-department resolution rate, SLA compliance and turnaround, with an A–D grade.
- 🔔 **Live activity notifications** — a realtime bell tells reporters the moment their issue is acknowledged, progressed or resolved.
- 🔮 **Predictive risk forecasting** (`/api/forecast`, on the dashboard) — Gemini forecasts which areas are most likely to see new/worsening issues next, with a risk score and reason (heuristic fallback).
- 📲 **PWA** — installable, offline app shell, and **offline report capture** with **Background Sync**: queued reports persist in IndexedDB and the service worker flushes them the moment connectivity returns — even if the tab was closed.
- 🌍 **Open-data API + embeddable widget** — CORS-enabled `/api/public/issues` & `/api/public/stats` (PII-stripped) and a standalone **`/embed`** map widget for local news / resident associations.
- ⚡ **Auto-escalation** — issues that breach their SLA are automatically escalated (priority raised, flagged on the authority console) — idempotent, runs opportunistically.

- 💬 **Community discussion** — realtime comment threads on every issue (sign-in to post).
- 📤 **CSV export** & **toasts**, an **accessibility pass** (focus styles, skip-link, reduced-motion, ARIA) and a **mobile-responsive** layout.

**Embed snippet:**
```html
<iframe src="https://YOUR-DOMAIN/embed?area=Koramangala" width="100%" height="480" style="border:0;border-radius:16px"></iframe>
```

---

## 🛠️ Google technologies used

- **Google Gemini API (`gemini-2.5-flash`)** via the official **`@google/genai`** SDK
  - **Vision** — multimodal image understanding of the reported issue
  - **Function calling / tool use** — the agent’s autonomous triage loop
  - **Structured output (`responseSchema`)** — reliable JSON for classification & insights
  - **Streaming** — live agent steps and the streamed assistant chat
- **OpenStreetMap & Leaflet** — live interactive issue map (vector markers, popups) + Nominatim search & reverse geocoding
- **Google AI Studio** — prototyping and one-click **Publish** deployment
- **Google Cloud Run** — the serverless target AI Studio publishes to

Gemini works from a `GEMINI_API_KEY`; Supabase unlocks auth, persistence and PostGIS spatial queries (see `SETUP.md`). No Google Maps API key or billing required.

---

## 🧱 Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- Server-side **Route Handlers** keep the Gemini key secret (never shipped to the browser)
- Hand-crafted light CSS design system + floating glassmorphic pill navbar
- `lucide-react` icons
- **Supabase** — Postgres (RLS), passwordless **email OTP** auth, Realtime, Storage
  - **PostGIS** — GiST-indexed geography column + `nearby_issues` RPC for radius dedup at scale
  - **pgvector** — HNSW-indexed 768-dim Gemini embeddings + `match_issues` RPC for semantic dedup
- Clean data facade (`lib/data.ts`) that uses Supabase when configured and an in-memory store otherwise

## 📁 Project structure

```
src/
├── app/
│   ├── page.tsx                 # Landing (live stats)
│   ├── report/                  # ⭐ Agentic report flow (live streaming)
│   ├── dashboard/               # KPIs, charts, hotspots, AI insights
│   ├── map/                     # Interactive city map
│   ├── fleet/                   # 🚛 Fleet Watch dashcam scanner
│   ├── authority/route/         # 🗺️ TSP dispatch route optimizer
│   ├── leaderboard/             # Gamification
│   ├── issues/[id]/             # Issue detail, timeline, AI Council, verify/track
│   └── api/
│       ├── triage/              # Runs the agent, streams NDJSON
│       ├── issues/ …            # list / detail / verify / status
│       ├── stats, hotspots      # analytics
│       ├── insights/            # Gemini predictive insights
│       └── assistant/           # streamed Gemini chat
├── components/                  # Navbar, CityMap, AgentTimeline, Assistant, …
└── lib/
    ├── agent.ts                 # 🧠 The Civic Triage Agent (tools + loop)
    ├── gemini.ts                # Gemini client + helpers
    ├── store.ts                 # In-memory store (dedup, stats, gamification)
    ├── departments.ts           # Category → department, SLA, priority model
    ├── geo.ts                   # Geo math + map projection
    └── seed.ts, types.ts
```

---

## 🚀 Run locally

```bash
npm install
cp .env.local.example .env.local   # add your GEMINI_API_KEY
npm run dev                        # http://localhost:3000
```

Get a free key at **https://aistudio.google.com/apikey**.

## ☁️ Deploy

**Google AI Studio (as required):** open the app in AI Studio → **Publish** → **Publish App**. AI Studio builds and deploys to a **Cloud Run** URL and injects `GEMINI_API_KEY`. See the [AI Studio deploying guide](https://ai.google.dev/gemini-api/docs/aistudio-deploying).

**Docker / Cloud Run (manual):** a production `Dockerfile` (Next.js standalone output) is included:

```bash
docker build -t community-hero .
gcloud run deploy community-hero --source . --set-env-vars GEMINI_API_KEY=...
```

---

## 🎯 How it maps to the evaluation matrix

- **Problem solving & impact** — closes the full loop (report → triage → route → track → resolve) with dedup so signal isn’t diluted.
- **Agentic depth** — a real, transparent multi-tool Gemini function-calling agent, streamed step-by-step.
- **Innovation** — “watch the agent work,” geo-aware dedup, AI advisories, predictive insights, grounded assistant.
- **Google technologies** — Gemini vision + tools + structured output + streaming, deployed via AI Studio → Cloud Run.
- **Product experience & design** — cohesive, animated, responsive UI.
- **Technical implementation** — typed, modular, secure (server-side key), clean build.
- **Completeness & usability** — every feature is wired end-to-end and works, with graceful AI fallbacks.

### Roles & demo access
Two roles: **citizen** (report, verify, track) and **authority** (claim → acknowledge → resolve, with the AI Ops Co-pilot).

Sign-in is **passwordless email OTP**. To explore the **Authority Console** instantly, click **“Enter as demo authority”** on the `/login` page — it's one-click (no email/password needed; the server mints a session for a pre-seeded authority account). Citizens sign in with their own email + a one-time code. To promote any real user to authority, see the snippet in `SETUP.md`.

> **Resilience:** every integration degrades gracefully. Without Supabase the app uses a seeded in-memory store; without a Maps key it uses a built-in SVG map; without Gemini it uses a heuristic classifier. The data layer is isolated behind `lib/data.ts`.
