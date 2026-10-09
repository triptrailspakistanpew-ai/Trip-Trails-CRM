import { create } from 'zustand';

interface InvalidationState {
  lastUpdated: number;
  invalidate: () => void;
}

export const useInvalidationStore = create<InvalidationState>((set) => ({
  lastUpdated: Date.now(),
  invalidate: () => set({ lastUpdated: Date.now() }),
}));
