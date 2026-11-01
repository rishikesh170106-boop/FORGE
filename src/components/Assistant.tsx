'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi! I'm Hero Assistant 🦸 — ask me about live issues, hotspots, or how to report something in your area.",
};

const SUGGESTIONS = [
  'What are the top hotspots right now?',
  'Any critical issues open?',
  'How do I report a pothole?',
];

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.body) throw new Error('no stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I could not reach the assistant just now.',
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open assistant"
      >
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>

      {open && (
        <div className="chat-panel animate-rise">
          <div className="chat-head">
            <span className="logo-badge" style={{ width: 30, height: 30 }}>
              <Bot size={16} color="#fff" />
            </span>
            <div>
              <strong style={{ color: 'var(--foreground)', fontSize: '0.95rem' }}>Hero Assistant</strong>
              <div className="tiny muted">Powered by Gemini · grounded in live data</div>
            </div>
          </div>

          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                {m.content || (busy && i === messages.length - 1 ? '…' : '')}
              </div>
            ))}
            {messages.length <= 1 && (
              <div className="chat-suggestions" style={{ marginTop: '0.5rem' }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="chat-foot"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="input-field"
              style={{ padding: '0.6rem 0.85rem' }}
              placeholder="Ask about your community…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
