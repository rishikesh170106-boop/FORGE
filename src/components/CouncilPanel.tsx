'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel,
  Loader2,
  Megaphone,
  Wallet,
  Scale,
  ArrowRight,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { priorityColor } from '@/components/ui';

interface Turn {
  role: 'advocate' | 'allocator' | 'arbitrator';
  name: string;
  icon: string;
  stance: string;
  argument: string;
  proposedPriority: number;
  proposedSlaHours: number;
}

interface Verdict {
  finalPriority: number;
  finalSlaHours: number;
  ruling: string;
  keyFactors: string[];
  agreement: string;
}

interface VerdictEvent {
  verdict: Verdict;
  previousPriority: number;
  previousSlaHours: number;
  applied: boolean;
}

const ROLE_ICON: Record<string, LucideIcon> = {
  Megaphone,
  Wallet,
  Scale,
};
const ROLE_TINT: Record<Turn['role'], string> = {
  advocate: '#dc2626',
  allocator: '#0891b2',
  arbitrator: '#7c3aed',
};

function slaText(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const d = Math.round(hours / 24);
  return `${d}d`;
}

const AGREEMENT_LABEL: Record<string, string> = {
  consensus: 'Unanimous consensus',
  compromise: 'Negotiated compromise',
  'advocate-favoured': 'Citizen case prevailed',
  'allocator-favoured': 'Capacity case prevailed',
};

/**
 * The AI Council — three Gemini agents (Citizen Advocate, Resource Allocator,
 * Arbitrator) debate the issue's fair priority and SLA live, and the binding
 * verdict is applied with an audit trail.
 */
export default function CouncilPanel({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [verdict, setVerdict] = useState<VerdictEvent | null>(null);
  const [started, setStarted] = useState(false);

  async function convene() {
    setBusy(true);
    setStarted(true);
    setTurns([]);
    setVerdict(null);
    try {
      const res = await fetch(`/api/issues/${id}/council`, { method: 'POST' });
      if (!res.ok || !res.body) throw new Error('failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === 'turn') setTurns((t) => [...t, ev.turn as Turn]);
          else if (ev.type === 'verdict') setVerdict(ev as VerdictEvent);
          else if (ev.type === 'error') throw new Error(ev.message);
        }
      }
      toast('The AI Council has ruled', 'success');
    } catch {
      toast('The council could not convene — try again', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: started ? '1rem' : 0 }}>
        <div>
          <div className="tiny" style={{ color: 'var(--primary-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Gavel size={13} style={{ verticalAlign: '-2px' }} /> AI Council — multi-agent negotiation
          </div>
          <p className="tiny muted" style={{ marginTop: '0.25rem' }}>
            Three AI agents — a Citizen Advocate, a Resource Allocator and an Arbitrator — debate this
            issue&apos;s fair priority and deadline using live city workload data.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={convene} disabled={busy}>
          {busy ? <Loader2 size={15} className="spin" /> : started ? <RefreshCw size={15} /> : <Gavel size={15} />}
          {busy ? 'Deliberating…' : started ? 'Reconvene' : 'Convene the council'}
        </button>
      </div>

      <AnimatePresence>
        {turns.map((t) => {
          const Icon = ROLE_ICON[t.icon] ?? Scale;
          const tint = ROLE_TINT[t.role];
          return (
            <motion.div
              key={`${t.role}-${t.stance}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                background: 'var(--card-2, rgba(0,0,0,0.02))',
                marginBottom: '0.6rem',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  minWidth: 34,
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${tint}1a`,
                  color: tint,
                }}
              >
                <Icon size={17} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <strong className="small" style={{ color: tint }}>{t.name}</strong>
                  <span className="tiny muted">
                    proposes <strong style={{ color: priorityColor(t.proposedPriority) }}>{t.proposedPriority}/100</strong> · SLA {slaText(t.proposedSlaHours)}
                  </span>
                </div>
                <div className="small" style={{ fontWeight: 600, margin: '0.15rem 0' }}>“{t.stance}”</div>
                <p className="tiny muted" style={{ lineHeight: 1.55 }}>{t.argument}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {busy && (
        <div className="tiny muted flex items-center gap-2" style={{ padding: '0.5rem 0' }}>
          <Loader2 size={13} className="spin" />
          {turns.length === 0 && 'The Citizen Advocate is preparing the residents’ case…'}
          {turns.length === 1 && 'The Resource Allocator is checking crew capacity…'}
          {turns.length >= 2 && 'The Arbitrator is weighing both arguments…'}
        </div>
      )}

      {verdict && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            marginTop: '0.4rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(124,58,237,0.35)',
            background: 'rgba(124,58,237,0.06)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="tiny" style={{ color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Scale size={12} style={{ verticalAlign: '-2px' }} /> Binding verdict · {AGREEMENT_LABEL[verdict.verdict.agreement] ?? 'Ruling'}
            </div>
            {verdict.applied && <span className="tag">applied to the case</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap" style={{ margin: '0.6rem 0' }}>
            <span className="small">
              Priority <strong style={{ color: priorityColor(verdict.previousPriority) }}>{verdict.previousPriority}</strong>
              <ArrowRight size={12} style={{ verticalAlign: '-1px', margin: '0 4px' }} />
              <strong style={{ color: priorityColor(verdict.verdict.finalPriority) }}>{verdict.verdict.finalPriority}/100</strong>
            </span>
            <span className="small">
              SLA <strong>{slaText(verdict.previousSlaHours)}</strong>
              <ArrowRight size={12} style={{ verticalAlign: '-1px', margin: '0 4px' }} />
              <strong>{slaText(verdict.verdict.finalSlaHours)}</strong>
            </span>
          </div>
          <p className="small" style={{ lineHeight: 1.55 }}>{verdict.verdict.ruling}</p>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '0.6rem' }}>
            {verdict.verdict.keyFactors.map((f) => (
              <span key={f} className="tag">{f}</span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
