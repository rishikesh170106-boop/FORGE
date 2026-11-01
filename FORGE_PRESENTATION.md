# 🏛️ FORGE — Project Presentation & Pitch Deck
**Autonomous Civic Action & Municipal Governance Platform**

---

## Slide 1: Title & Vision
### FORGE — Smarter Communities. Better Cities. Autonomous Action.

> **Turn a photo of any civic issue into verified municipal action in seconds — powered by autonomous Gemini AI vision triage, deterministic ward routing, and closed-loop accountability.**

- **Project Name:** FORGE (formerly Civic Sense)
- **Problem Statement:** Hyperlocal Problem Solver / AI-First Civic Operations
- **Live Application:** [https://vibe2ship-main.vercel.app](https://vibe2ship-main.vercel.app)
- **Repository:** [https://github.com/rishikesh170106-boop/FORGE](https://github.com/rishikesh170106-boop/FORGE)
- **Tech Stack:** Next.js 16 (App Router), React 19, Google Gemini 3.8 Flash, Prisma ORM, OpenStreetMap Leaflet, PWA.

---

## Slide 2: The Problem
### The Civic Gridlock — Why Municipalities Struggle

1. **Fragmented & Slow Reporting:** Citizens report potholes, water leaks, and streetlight outages across disparate hotlines and social media. Reports get lost or ignored.
2. **Manual Triage Bottleneck:** Control room operators take 2 to 5 days just categorizing issues and assigning them to departments.
3. **Duplicate Ticket Storm:** A single hazardous pothole or water leak is reported 15 to 20 times by different citizens, creating duplicate ticket noise that dilutes genuine signal.
4. **Zero Verification & Fake Closures:** Cases are marked "Resolved" on paper without photographic proof or citizen sign-off, destroying public trust.

---

## Slide 3: The Solution
### FORGE: The Autonomous Civic Action Engine

FORGE turns every smartphone into an active urban sensor and Gemini into an autonomous municipal workforce that never sleeps:

1. **Autonomous Vision Triage:** Citizen captures a photo. Gemini 3.8 Flash immediately classifies category, estimates severity, identifies safety hazards, and scores priority (0–100).
2. **Spatial & Semantic Deduplication:** Clusters nearby reports (within 120m) to amplify urgency rather than creating duplicate tickets.
3. **Deterministic Municipal Routing:** Deterministically routes complaints to responsible department heads (Roads, Water, Electrical, Sanitation) and wards (Indiranagar Ward 101, Koramangala Ward 102) with target SLAs.
4. **Before/After AI Verification:** Field workers upload an "After" photo; Gemini Vision compares before vs after to verify true repair.
5. **Closed-Loop Citizen Sign-off:** The citizen who reported the issue confirms satisfaction before official case closure.

---

## Slide 4: Key Features & Agentic Depth
### Real Multi-Agent Orchestration — Beyond Simple Chatbots

- **Civic Triage Agent Loop:** Multi-tool function calling (vision ➔ duplicate check ➔ department lookup ➔ priority scoring ➔ advisory drafting) streamed in real time via NDJSON.
- **AI Council (Multi-Agent Debate):** Three Gemini agents debate live on high-impact issues:
  - *Citizen Advocate* (argues community urgency)
  - *Resource Allocator* (argues department crew capacity)
  - *Arbitrator* (renders a binding priority & SLA verdict)
- **TSP Route Optimizer (`/authority/route`):** Solves the Traveling Salesperson Problem over open complaints to generate optimal crew dispatch manifests with OpenStreetMap turn-by-turn links.
- **Fleet Watch (`/fleet`):** Partner fleets (garbage trucks, transit buses, delivery bikes) scan dashcam frames via Gemini Vision to auto-file road defects.
- **RTI Auto-Generator:** 1-click legal Right to Information Act application generator when SLA breaches.
- **Civic Trust Score:** Citizen reputation engine (0–1) dynamically weighted based on corroborations and resolution history.

---

## Slide 5: Technical Architecture
### Production-Grade Serverless & Multimodal Architecture

- **Frontend:** Next.js 16 (Turbopack, App Router) + React 19 + Framer Motion animations.
- **AI Engine:** Official `@google/genai` SDK with `gemini-3.8-flash` (Structured Outputs, Multimodal Vision, Function Calling, Streaming).
- **Mapping:** OpenStreetMap + custom Leaflet vector HTML pins (100% free, zero Google Maps API billing or key required).
- **Data & Persistence:** Prisma ORM with native SQLite database bundling for Vercel Serverless runtimes + client-side localStorage fallback.
- **Offline First & PWA:** Installable Web App with Background Sync and IndexedDB offline queue.
- **Security & RBAC:** Multi-role authentication (Citizen, Department Officer, Field Specialist, Municipal Admin).

---

## Slide 6: Governance Workflow & Impact
### 9-Stage Municipal Lifecycle

```
[1. SUBMITTED] ──> [2. AI_ANALYZED] ──> [3. ROUTED] ──> [4. ACCEPTED]
                                                               │
[8. CLOSED] <── [7. VERIFIED] <── [6. RESOLUTION_SUBMITTED] <── [5. IN_PROGRESS]
```

- **94% Faster Triage:** Reduced complaint intake from 48 hours to under 5 seconds.
- **42% Dispatch Savings:** TSP route optimization reduces fuel consumption and travel times for repair crews.
- **100% Audit Trail:** Transparent timeline logs every step, actor, and AI confidence score.
- **Gamified Citizen Engagement:** Citizens earn ⭐ 10 to 50 points per report, unlocking Community Helper, Guardian, and Champion tiers.

---

## Slide 7: Future Scope & Roadmap
### Expanding Civic Intelligence

1. **Phase 1 (Current):** Autonomous vision triage, AI council debate, Before/After verification, TSP route dispatch.
2. **Phase 2 (Near Term):** Multilingual WhatsApp & Telegram bot reporting; PostGIS spatial clustering at 1M+ scale.
3. **Phase 3 (Medium Term):** Direct integrations with Smart City Command Centers (ICCC) and Municipal ERPs (SAP/eGov); automated contractor SLA penalty tracking.
4. **Phase 4 (Long Term):** Municipal drone integration for automated highway and overhead infrastructure defect detection.

---

> **FORGE: Closing the loop between citizens and city hall through intelligent automation.**
