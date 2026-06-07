import { create } from 'zustand';
import { API, authHeaders } from '../lib/api';

interface PremiumState {
  isPremium: boolean;
  loading:   boolean;
  checked:   boolean;
  check:     () => Promise<void>;
  reset:     () => void;
}

export const usePremium = create<PremiumState>((set) => ({
  isPremium: false,
  loading:   false,
  checked:   false,

  check: async () => {
    set({ loading: true });
    try {
      const res  = await fetch(`${API.subscriptions}/subscriptions/check`, { headers: authHeaders() });
      const data = await res.json();
      set({ isPremium: data.premium ?? false, checked: true });
    } catch {
      set({ isPremium: false, checked: true });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ isPremium: false, checked: false }),
}));