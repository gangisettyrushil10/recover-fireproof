'use client';

/**
 * Zustand store kept intentionally tiny: outbox count + theme only.
 */

import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface UiState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  outboxCount: number;
  setOutboxCount: (n: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  setTheme: (t) => {
    set({ theme: t });
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = t;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fireproof:theme', t);
    }
  },
  outboxCount: 0,
  setOutboxCount: (n) => set({ outboxCount: n }),
}));
