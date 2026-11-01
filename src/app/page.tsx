'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Camera,
  Bot,
  Building2,
  Activity,
  ShieldCheck,
  MapPinned,
  TrendingUp,
  Trophy,
  Layers,
  Gauge,
  CheckCircle2,
  FileSignature,
  Languages,
  Gavel,
  Video,
  ScrollText,
  Route,
  HeartPulse,
} from 'lucide-react';
import NearMeFeed from '@/components/NearMeFeed';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 16 } },
};

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString()}{suffix}</>;
}

const STEPS = [
  { icon: Camera, title: '1 · Snap & report', text: 'Upload a photo of any local problem — pothole, leak, garbage, broken light — in one tap.' },
  { icon: Bot, title: '2 · Agent triages', text: 'The Gemini agent sees the photo, classifies it, scores priority, and checks for duplicate reports nearby.' },
  { icon: Building2, title: '3 · Auto-routed', text: 'It identifies the responsible department, drafts a formal official letter with an SLA, and files it instantly — one click to email the authority.' },
  { icon: Activity, title: '4 · Track & verify', text: 'The community verifies and tracks resolution live on the map and dashboard — transparent and accountable.' },
];

const FEATURES = [
  { icon: Camera, title: 'Image-based reporting', text: 'Just a photo. Gemini Vision does the rest — no forms, no jargon.' },
  { icon: Bot, title: 'AI issue categorization', text: 'Automatic category, severity, tags and a safety-risk assessment.' },
  { icon: MapPinned, title: 'Geo-location & mapping', text: 'Every report is geotagged on a live OpenStreetMap — see issues near you.' },
  { icon: ShieldCheck, title: 'Community verification', text: 'Neighbours confirm issues, boosting priority and trust.' },
  { icon: Activity, title: 'Real-time tracking', text: 'A transparent timeline from Reported to Resolved, live across users.' },
  { icon: TrendingUp, title: 'Impact dashboards', text: 'Live KPIs, category breakdowns and resolution analytics.' },
  { icon: Gauge, title: 'Predictive insights', text: 'Gemini spots hotspots and predicts what will worsen next.' },
  { icon: Trophy, title: 'Gamified engagement', text: 'Points, levels and a leaderboard reward active citizens.' },
  { icon: FileSignature, title: 'AI official letters', text: 'One click drafts a formal complaint letter to the right department — copy, print or email it.' },
];

// Capabilities most civic-reporting apps don't have — our edge.
const DIFFERENTIATORS = [
  { icon: Gavel, title: 'Multi-agent AI Council', text: 'A Citizen Advocate, Resource Allocator and Arbitrator debate each case live and hand down a fair priority + SLA.' },
  { icon: ShieldCheck, title: 'Trust-weighted triage', text: 'Every reporter earns a transparent Civic Trust Score from their track record — proven reporters carry more signal, spam carries less, and neighbours can verify or dispute any report.' },
  { icon: Video, title: 'Fleet Watch dashcams', text: 'Partner fleet dashcams scan the streets with Gemini Vision and auto-file issues — zero citizen effort.' },
  { icon: ScrollText, title: 'RTI auto-generator', text: 'SLA breached? One click drafts a formal Right to Information application to compel a departmental answer.' },
  { icon: Route, title: 'TSP dispatch routing', text: 'The authority console solves the shortest crew tour over open issues — fewer km, faster fixes, less CO₂.' },
  { icon: FileSignature, title: 'AI official correspondence', text: 'Formal, department-ready letters drafted by Gemini — not just an internal ticket.' },
  { icon: Languages, title: 'Report in your language', text: 'Speak or type in any Indian language; the agent writes the report in it.' },
  { icon: CheckCircle2, title: 'AI-verified before/after proof', text: 'Gemini Vision compares the fix photo to prove issues are genuinely resolved.' },
  { icon: Gauge, title: 'Predictive risk forecasting', text: 'The system flags hotspots and predicts what will worsen before it does.' },
];

/** City Health Score (0-100): resolution rate + critical load + turnaround. */
function healthScore(s: { total: number; resolved: number; critical: number; avgResolutionH: number }): number {
  if (!s.total) return 100;
  const resolutionRate = s.resolved / s.total;
  const criticalLoad = 1 - Math.min(1, s.critical / s.total);
  const turnaround = s.avgResolutionH <= 72 ? 1 : Math.max(0.2, 72 / s.avgResolutionH);
  return Math.round(55 * resolutionRate + 25 * criticalLoad + 20 * turnaround);
}
function healthGrade(score: number): { grade: string; color: string } {
  if (score >= 85) return { grade: 'A', color: '#16a34a' };
  if (score >= 70) return { grade: 'B', color: '#d97706' };
  if (score >= 50) return { grade: 'C', color: '#ea580c' };
  return { grade: 'D', color: '#dc2626' };
}

interface Stats { total: number; resolved: number; critical: number; verifications: number; avgResolutionH: number }

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch('/api/stats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  const kpis = [
    { value: stats?.total ?? 0, suffix: '', label: 'Issues reported' },
    { value: stats?.resolved ?? 0, suffix: '', label: 'Resolved' },
    { value: stats?.verifications ?? 0, suffix: '', label: 'Verifications' },
    { value: stats?.avgResolutionH ?? 0, suffix: 'h', label: 'Avg. resolution' },
  ];

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      {/* Hero */}
      <section className="hero">
        <motion.span className="eyebrow" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <Bot size={14} /> Agentic AI · Powered by Google Gemini
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}>
          Turn a photo into <span className="text-gradient">civic action</span>
          <br /> in seconds.
        </motion.h1>
        <motion.p className="lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          CIVIC SENSE powers smarter communities and better cities. Snap any local issue and an
          autonomous AI agent classifies it, routes it to the right municipal department,
          and tracks it to verified resolution with the whole community.
        </motion.p>
        <motion.div className="flex gap-3 justify-center flex-wrap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Link href="/report-issue" className="btn btn-primary"><Camera size={18} /> Report an issue</Link>
          <Link href="/dashboard" className="btn btn-secondary"><Activity size={18} /> View live dashboard</Link>
        </motion.div>
      </section>

      {/* Live impact strip */}
      <motion.section className="panel" style={{ padding: '0.5rem', marginTop: '2rem' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="kpi-grid">
          {/* City Health Score — one number for how the city is doing today */}
          {(() => {
            const score = stats ? healthScore(stats) : 0;
            const { grade, color } = healthGrade(score);
            return (
              <div className="kpi">
                <div className="kpi-icon" style={{ background: `${color}1a`, color }}><HeartPulse size={22} /></div>
                <div>
                  <div className="kpi-value" style={{ color }}>
                    {stats ? <><CountUp value={score} /> · {grade}</> : '—'}
                  </div>
                  <div className="kpi-label">City health score</div>
                </div>
              </div>
            );
          })()}
          {kpis.map((k) => (
            <div key={k.label} className="kpi">
              <div className="kpi-icon" style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)' }}><Activity size={22} /></div>
              <div>
                <div className="kpi-value"><CountUp value={k.value} suffix={k.suffix} /></div>
                <div className="kpi-label">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Near me */}
      <section style={{ marginTop: '2.5rem' }}>
        <NearMeFeed limit={3} />
      </section>

      {/* How it works */}
      <section style={{ marginTop: '4rem' }}>
        <div className="center-text" style={{ marginBottom: '2rem' }}>
          <span className="pill pill-teal"><Bot size={14} /> Watch the agent work</span>
          <h2 style={{ marginTop: '1rem' }}>From snapshot to solved — autonomously</h2>
          <p className="muted" style={{ maxWidth: 560, margin: '0.5rem auto 0' }}>
            Not just reminders or forms. A real multi-step agent that reasons, uses
            tools, and takes action on the citizen&apos;s behalf.
          </p>
        </div>
        <motion.div className="cards-grid" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {STEPS.map((s) => (
            <motion.div key={s.title} className="glass-card hoverable" variants={item} whileHover={{ y: -5 }}>
              <div className="kpi-icon" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', marginBottom: '1rem' }}><s.icon size={22} /></div>
              <h3 style={{ fontSize: '1.05rem' }}>{s.title}</h3>
              <p className="muted small">{s.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* What makes us different */}
      <section style={{ marginTop: '4rem' }}>
        <div className="center-text" style={{ marginBottom: '2rem' }}>
          <span className="pill pill-primary"><Layers size={14} /> Beyond a reporting form</span>
          <h2 style={{ marginTop: '1rem' }}>What sets CIVIC SENSE apart</h2>
          <p className="muted" style={{ maxWidth: 560, margin: '0.5rem auto 0' }}>
            Most civic apps stop at logging a complaint. We take it end-to-end — in
            your language, with proof, and with a letter the authority can act on.
          </p>
        </div>
        <motion.div className="cards-grid" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {DIFFERENTIATORS.map((d) => (
            <motion.div key={d.title} className="glass-card hoverable" variants={item} whileHover={{ y: -5 }}>
              <div className="kpi-icon" style={{ background: 'var(--primary-tint)', color: 'var(--primary)', marginBottom: '1rem' }}><d.icon size={22} /></div>
              <h3 style={{ fontSize: '1.05rem' }}>{d.title}</h3>
              <p className="muted small">{d.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Agentic depth callout */}
      <motion.section className="panel" style={{ marginTop: '4rem', padding: '2.5rem' }} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
        <div className="two-col items-center">
          <div>
            <span className="pill pill-primary"><Layers size={14} /> Real agentic depth</span>
            <h2 style={{ marginTop: '1rem' }}>A transparent agent that uses tools — not a black box</h2>
            <p className="muted">
              The Civic Triage Agent runs a live function-calling loop on Gemini 2.5
              Flash. You literally see each step: vision analysis, duplicate detection,
              department routing, priority scoring, and the filed work order — every
              decision grounded in tool outputs over your live community data.
            </p>
            <div className="flex gap-3" style={{ marginTop: '1.5rem' }}>
              <Link href="/report-issue" className="btn btn-primary">Try the agent <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div className="glass-card" style={{ background: 'var(--card-2)' }}>
            <div className="timeline">
              {[
                { i: <Bot size={18} />, t: 'Analyzing photo with Gemini Vision', d: 'Pothole · Critical · 96% confidence' },
                { i: <Layers size={18} />, t: 'Checking duplicates nearby', d: 'Found 2 reports within 120m' },
                { i: <Building2 size={18} />, t: 'Routing to department', d: 'Roads & Infrastructure · SLA 3 days' },
                { i: <Gauge size={18} />, t: 'Scoring priority', d: 'Priority 92 / 100' },
                { i: <CheckCircle2 size={18} />, t: 'Work order WO-5209 filed', d: 'Dispatched to field crew' },
              ].map((s, idx) => (
                <motion.div key={idx} className="tl-step done" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.12 }}>
                  <div className="tl-icon">{s.i}</div>
                  <div className="tl-body">
                    <div className="tl-title">{s.t}</div>
                    <div className="tl-detail">{s.d}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Features */}
      <section style={{ marginTop: '4rem' }}>
        <div className="center-text" style={{ marginBottom: '2rem' }}>
          <h2>Everything a community needs</h2>
          <p className="muted">Reporting, verification, tracking and resolution — in one place.</p>
        </div>
        <motion.div className="cards-grid" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {FEATURES.map((f) => (
            <motion.div key={f.title} className="glass-card hoverable" variants={item} whileHover={{ y: -5 }}>
              <div className="kpi-icon" style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)', marginBottom: '1rem' }}><f.icon size={20} /></div>
              <h3 style={{ fontSize: '1rem' }}>{f.title}</h3>
              <p className="muted small">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <motion.section
        style={{ marginTop: '4rem', padding: '3rem 2rem', borderRadius: 'var(--radius-xl)', textAlign: 'center', background: 'linear-gradient(120deg, rgba(112,45,59,0.08), rgba(217,183,186,0.14))', border: '1px solid var(--surface-border)' }}
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 style={{ fontSize: '2rem' }}>See a problem? Shape your city.</h2>
        <p className="muted" style={{ maxWidth: 520, margin: '0.5rem auto 1.75rem' }}>It takes 15 seconds. The agent handles the rest.</p>
        <Link href="/report-issue" className="btn btn-primary"><Camera size={18} /> Report your first issue</Link>
      </motion.section>
    </div>
  );
}
