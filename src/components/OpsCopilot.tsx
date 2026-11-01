'use client';

import { useState } from 'react';
import { Loader2, Bot, ArrowRight } from 'lucide-react';

interface PlanItem {
  ref: string;
  title: string;
  action: string;
  rationale: string;
  order: number;
}

export default function OpsCopilot() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ ai: boolean; summary: string; plan: PlanItem[] } | null>(null);

  async function run() {
    setLoading(true);
    try {
      const r = await fetch('/api/authority/plan', { method: 'POST' }).then((x) => x.json());
      setData(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card" style={{ borderColor: 'rgba(37,99,235,0.25)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.75rem' }}>
        <div className="flex items-center gap-2">
          <span className="kpi-icon" style={{ width: 38, height: 38, background: 'var(--primary-tint)', color: 'var(--primary-600)' }}>
            <Bot size={20} />
          </span>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>AI Ops Co-pilot</h2>
            <p className="tiny muted">Plans a city-wide dispatch order across every open issue</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={15} className="spin" /> : <Bot size={15} />}
          {data ? 'Re-plan' : 'Generate dispatch plan'}
        </button>
      </div>

      {data && (
        <div className="animate-fade-in">
          <div className="panel" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
            <span className={`pill ${data.ai ? 'pill-teal' : 'pill-muted'}`} style={{ marginBottom: '0.5rem' }}>
              {data.ai ? 'Gemini plan' : 'Heuristic plan'}
            </span>
            <p className="small">{data.summary}</p>
          </div>
          <div className="flex-col gap-2">
            {data.plan.map((p) => (
              <div key={p.order} className="flex items-start gap-3 panel" style={{ padding: '0.7rem 0.9rem' }}>
                <span className="kpi-icon" style={{ width: 30, height: 30, fontSize: '0.85rem', fontWeight: 800, background: 'var(--foreground)', color: 'var(--background)' }}>
                  {p.order}
                </span>
                <div className="flex-1">
                  <div className="small" style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                    {p.title} <span className="mono tiny muted">{p.ref}</span>
                  </div>
                  <div className="tiny" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                    <ArrowRight size={11} style={{ verticalAlign: '-1px' }} /> {p.action}
                  </div>
                  <div className="tiny muted">{p.rationale}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
