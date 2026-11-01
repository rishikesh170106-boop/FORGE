'use client';

import { Loader2 } from 'lucide-react';
import type { AgentStep } from '@/lib/types';
import { DynIcon } from './ui';

export default function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="timeline">
      {steps.map((s) => (
        <div key={s.id} className={`tl-step ${s.status}`}>
          <div className="tl-icon">
            <DynIcon name={s.icon} size={18} />
          </div>
          <div className="tl-body">
            <div className="tl-title">
              {s.title}
              {s.status === 'running' && (
                <Loader2 size={14} className="spin" color="#2563eb" />
              )}
            </div>
            <div className="tl-detail">{s.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
