'use client';

import { useState } from 'react';
import { FileText, Loader2, Copy, Download, Printer, Mail, Bot, RefreshCw, ScrollText } from 'lucide-react';
import { toast } from '@/lib/toast';

interface LetterResult {
  letter: string;
  kind: 'official' | 'rti';
  subject: string;
  to: string;
  department: string;
  aiGenerated: boolean;
}

/**
 * AI-drafted official correspondence: a formal complaint letter to the
 * department, and — for issues stuck past their SLA — a ready-to-file
 * application under the Right to Information Act, 2005.
 */
export default function OfficialLetter({ id, slaBreached = false }: { id: string; slaBreached?: boolean }) {
  const [busy, setBusy] = useState<'official' | 'rti' | null>(null);
  const [data, setData] = useState<LetterResult | null>(null);

  async function generate(kind: 'official' | 'rti') {
    setBusy(kind);
    try {
      const r = await fetch(`/api/issues/${id}/letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      if (!r.ok) throw new Error('failed');
      const d = (await r.json()) as LetterResult;
      setData(d);
      toast(
        d.aiGenerated
          ? kind === 'rti' ? 'RTI application drafted by AI' : 'Official letter drafted by AI'
          : kind === 'rti' ? 'RTI application drafted' : 'Official letter drafted',
        'success',
      );
    } catch {
      toast('Could not draft the document — try again', 'error');
    } finally {
      setBusy(null);
    }
  }

  function copy() {
    if (!data) return;
    navigator.clipboard.writeText(data.letter).then(
      () => toast('Copied to clipboard', 'success'),
      () => toast('Copy failed', 'error'),
    );
  }

  function download() {
    if (!data) return;
    const blob = new Blob([data.letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.kind === 'rti' ? 'rti-application' : 'official-letter'}-${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function print() {
    if (!data) return;
    const w = window.open('', '_blank', 'width=760,height=900');
    if (!w) return;
    w.document.write(
      `<pre style="font-family:Georgia,serif;font-size:14px;line-height:1.6;white-space:pre-wrap;padding:48px;color:#111">${data.letter.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))}</pre>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  function email() {
    if (!data) return;
    const href = `mailto:${encodeURIComponent(data.to)}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.letter)}`;
    window.location.href = href;
  }

  const buttons = (
    <div className="flex gap-2 flex-wrap items-center">
      <button className="btn btn-secondary" onClick={() => generate('official')} disabled={busy !== null}>
        {busy === 'official' ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
        {busy === 'official' ? 'Drafting…' : 'Draft official letter'}
      </button>
      <button className="btn btn-secondary" onClick={() => generate('rti')} disabled={busy !== null}>
        {busy === 'rti' ? <Loader2 size={16} className="spin" /> : <ScrollText size={16} />}
        {busy === 'rti' ? 'Drafting…' : 'Draft RTI request'}
      </button>
      {slaBreached && !data && (
        <span className="tiny" style={{ color: '#dc2626', fontWeight: 600 }}>
          SLA breached — an RTI application can compel a formal answer.
        </span>
      )}
    </div>
  );

  if (!data) return buttons;

  return (
    <div className="panel" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.85rem' }}>
        <div className="tiny" style={{ color: 'var(--primary-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {data.kind === 'rti' ? (
            <><ScrollText size={13} style={{ verticalAlign: '-2px' }} /> RTI application · {data.department}</>
          ) : (
            <><FileText size={13} style={{ verticalAlign: '-2px' }} /> Official letter · {data.department}</>
          )}
        </div>
        {data.aiGenerated && (
          <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Bot size={11} /> AI-drafted
          </span>
        )}
      </div>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '0.9rem',
          lineHeight: 1.65,
          background: 'var(--card-2, rgba(0,0,0,0.02))',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          margin: 0,
          maxHeight: 360,
          overflow: 'auto',
        }}
      >
        {data.letter}
      </pre>

      <div className="flex gap-2 flex-wrap" style={{ marginTop: '1rem' }}>
        <button className="btn btn-secondary" onClick={copy}><Copy size={15} /> Copy</button>
        <button className="btn btn-secondary" onClick={download}><Download size={15} /> Download</button>
        <button className="btn btn-secondary" onClick={print}><Printer size={15} /> Print</button>
        <button className="btn btn-primary" onClick={email}><Mail size={15} /> Email department</button>
        <button className="btn btn-ghost" onClick={() => generate(data.kind)} disabled={busy !== null}>
          {busy ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />} Redraft
        </button>
        <button className="btn btn-ghost" onClick={() => generate(data.kind === 'rti' ? 'official' : 'rti')} disabled={busy !== null}>
          {data.kind === 'rti' ? <FileText size={15} /> : <ScrollText size={15} />}
          {data.kind === 'rti' ? 'Switch to letter' : 'Switch to RTI'}
        </button>
      </div>
    </div>
  );
}
