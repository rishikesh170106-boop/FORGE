'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from '@/lib/toast';

/** Native share (mobile) with clipboard fallback — every issue is a campaign. */
export default function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* user dismissed the sheet — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied — share it to rally your neighbours!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy the link', 'error');
    }
  }

  return (
    <button className="btn btn-secondary" onClick={share}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? 'Copied' : 'Share'}
    </button>
  );
}
