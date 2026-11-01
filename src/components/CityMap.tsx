'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Issue } from '@/lib/types';
import { projectToMap } from '@/lib/geo';
import { CategoryIcon, SEVERITY_COLOR, SeverityBadge, StatusBadge } from './ui';

export default function CityMap({
  issues,
  activeId,
}: {
  issues: Issue[];
  activeId?: string;
}) {
  const [hover, setHover] = useState<string | null>(activeId ?? null);
  const active = issues.find((i) => i.id === hover);

  return (
    <div className="citymap">
      {/* stylised street grid */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, opacity: 0.5 }}
        preserveAspectRatio="none"
      >
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={`${(i / 10) * 100}%`}
            y1="0"
            x2={`${(i / 10) * 100}%`}
            y2="100%"
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={`${(i / 7) * 100}%`}
            x2="100%"
            y2={`${(i / 7) * 100}%`}
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="1"
          />
        ))}
      </svg>

      {issues.map((issue) => {
        const { x, y } = projectToMap(issue.geo);
        const color = SEVERITY_COLOR[issue.severity];
        const isActive = hover === issue.id;
        return (
          <div
            key={issue.id}
            className={`map-pin ${isActive ? 'active' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, color }}
            onMouseEnter={() => setHover(issue.id)}
            onClick={() => setHover(issue.id)}
          >
            {(issue.severity === 'Critical' || issue.severity === 'High') && (
              <span className="pin-ring" style={{ color }} />
            )}
            <span className="pin-dot" style={{ background: color }} />
          </div>
        );
      })}

      {active && (
        <Link
          href={`/issues/${active.id}`}
          className="glass"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '0.75rem',
            transform: 'translateX(-50%)',
            width: 'min(340px, calc(100% - 1.5rem))',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            zIndex: 10,
          }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: '0.4rem' }}>
            <span style={{ color: SEVERITY_COLOR[active.severity] }}>
              <CategoryIcon category={active.category} size={16} />
            </span>
            <strong style={{ color: 'var(--foreground)', fontSize: '0.92rem' }}>{active.title}</strong>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={active.severity} />
            <StatusBadge status={active.status} />
            <span className="tiny muted">{active.location}</span>
          </div>
        </Link>
      )}

      {/* legend */}
      <div
        className="glass"
        style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          gap: '0.75rem',
          fontSize: '0.72rem',
        }}
      >
        {(['Critical', 'High', 'Medium', 'Low'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="dot"
              style={{ background: SEVERITY_COLOR[s], width: 8, height: 8 }}
            />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
