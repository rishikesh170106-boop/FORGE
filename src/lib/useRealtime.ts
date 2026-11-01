'use client';

import { useEffect } from 'react';

// Calls `onChange` whenever local issues change so dashboard stays live
export function useRealtime(onChange: () => void) {
  useEffect(() => {
    const handler = () => onChange();
    window.addEventListener('ch-issue-change', handler);
    return () => {
      window.removeEventListener('ch-issue-change', handler);
    };
  }, [onChange]);
}
