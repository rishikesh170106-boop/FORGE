'use client';

import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, MapPin } from 'lucide-react';
import { useRealtime } from '@/lib/useRealtime';
import { priorityColor } from '@/components/ui';

interface Forecast {
  area: string;
  predictedCategory: string;
  riskScore: number;
  reason: string;
  timeframe: string;
}

function riskLabel(n: number): string {
  if (n >= 80) return 'Critical';
  if (n >= 60) return 'High';
  if (n >= 40) return 'Medium';
  return 'Low';
}

export default function ForecastPanel() {
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return fetch('/api/forecast', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setForecast(d.forecast || []);
        setAi(d.ai);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(load);

  return (
    <div className="glass-card" style={{ borderColor: 'rgba(217,119,6,0.25)' }}>
      <div className="section-title" style={{ marginBottom: '1rem' }}>
        <TrendingUp size={18} color="#d97706" />
        <h2 style={{ fontSize: '1.1rem' }}>Risk forecast</h2>
        <span className={`pill ${ai ? 'pill-teal' : 'pill-muted'}`} style={{ marginLeft: 'auto' }}>
          {ai ? 'Gemini' : 'Heuristic'}
        </span>
      </div>

      {loading && forecast.length === 0 && <p className="muted small">Forecasting hotspots…</p>}

      <div className="flex-col gap-2">
        {forecast.map((f, i) => (
          <div key={i} className="panel" style={{ padding: '0.8rem 1rem' }}>
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: '0.35rem' }}>
              <span className="flex items-center gap-1" style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                <MapPin size={13} color="var(--muted)" /> {f.area}
              </span>
              <span
                className="badge"
                style={{ background: priorityColor(f.riskScore) + '22', color: priorityColor(f.riskScore) }}
              >
                {riskLabel(f.riskScore)} risk · {f.riskScore}
              </span>
            </div>
            <div className="tiny" style={{ color: 'var(--primary-600)', fontWeight: 600, marginBottom: '0.2rem' }}>
              Likely: {f.predictedCategory} · {f.timeframe}
            </div>
            <div className="tiny muted">{f.reason}</div>
            <div className="meter" style={{ marginTop: '0.5rem' }}>
              <span style={{ width: `${f.riskScore}%`, background: priorityColor(f.riskScore) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
