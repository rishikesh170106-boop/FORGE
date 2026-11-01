'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trophy, Medal, ThumbsUp, Camera, CheckCircle2, Zap } from 'lucide-react';
import { useRealtime } from '@/lib/useRealtime';
import type { Citizen } from '@/lib/types';

function level(points: number): { name: string; emoji: string; next: number } {
  if (points >= 500) return { name: 'Civic Champion', emoji: '🦸', next: points };
  if (points >= 300) return { name: 'City Guardian', emoji: '🏅', next: 500 };
  if (points >= 150) return { name: 'Active Citizen', emoji: '🛡️', next: 300 };
  if (points >= 50) return { name: 'Neighbourhood Helper', emoji: '🤝', next: 150 };
  return { name: 'Newcomer', emoji: '🌱', next: 50 };
}

const MEDAL = ['#fbbf24', '#3f3f46', '#d97706'];

export default function CommunityRankingsPage() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);

  const load = useCallback(() => {
    return fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCitizens(d.citizens));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(load);

  const podium = citizens.slice(0, 3);
  const rest = citizens.slice(3);

  return (
    <div className="container narrow animate-fade-in">
      <div className="center-text" style={{ marginBottom: '2rem' }}>
        <span className="eyebrow"><Trophy size={14} /> CIVIC SENSE Rankings</span>
        <h1 style={{ marginTop: '1rem' }}>Community Rankings</h1>
        <p className="muted" style={{ maxWidth: 520, margin: '0.5rem auto 0' }}>
          Every report and verification earns points and trust score. The more you help, the
          higher you climb — driving smarter communities and better cities.
        </p>
      </div>

      {/* Podium */}
      <div className="flex justify-center items-end gap-4 flex-wrap" style={{ marginBottom: '2.5rem' }}>
        {podium.map((c, i) => {
          const lv = level(c.points);
          const order = [1, 0, 2][i]; // visually center #1
          const isFirst = i === 0;
          return (
            <div
              key={c.id}
              className="glass-card center-text"
              style={{
                order,
                flex: '1 1 200px',
                maxWidth: 240,
                padding: isFirst ? '2rem 1.5rem' : '1.5rem',
                border: isFirst ? '2px solid rgba(251, 191, 36, 0.5)' : undefined,
                background: isFirst ? 'linear-gradient(180deg, rgba(251, 191, 36, 0.08), var(--card))' : undefined,
              }}
            >
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: isFirst ? '3.5rem' : '2.5rem', lineHeight: 1 }}>{c.avatar}</span>
                <span
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -6,
                    background: MEDAL[i] ?? '#71717a',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  #{i + 1}
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem' }}>{c.name}</h3>
              <div className="small muted" style={{ margin: '0.25rem 0 0.5rem' }}>
                {lv.emoji} {lv.name}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {c.points.toLocaleString()} <span className="small muted">pts</span>
              </div>
              <div className="tiny muted" style={{ marginTop: '0.5rem' }}>
                {c.reports} reports · {c.verifications} verified
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of the list */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card-2)' }}>
              <th style={{ padding: '0.85rem 1rem', width: 50 }}>#</th>
              <th style={{ padding: '0.85rem 1rem' }}>Citizen</th>
              <th style={{ padding: '0.85rem 1rem' }}>Level</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Activity</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((c, i) => {
              const lv = level(c.points);
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--muted)' }}>
                    {i + 4}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.3rem' }}>{c.avatar}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div className="tiny muted">{lv.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }} className="small">
                    {lv.emoji} {lv.name}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }} className="tiny muted">
                    <span title="Reports filed">{c.reports} <Camera size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /></span>
                    {' · '}
                    <span title="Verifications">{c.verifications} <ThumbsUp size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /></span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                    {c.points.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
