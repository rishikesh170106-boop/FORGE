'use client';

export type ToastType = 'success' | 'error' | 'info';

// Fire-and-forget toast — no provider needed; <Toaster/> listens for the event.
export function toast(message: string, type: ToastType = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('ch-toast', { detail: { message, type, id: Date.now() + Math.random() } }),
  );
}
