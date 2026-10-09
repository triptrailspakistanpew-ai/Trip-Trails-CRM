import { create } from "zustand";

interface CreateDrawerStore {
  shouldOpen: boolean;
  requestOpen: () => void;
  consumeRequest: () => void;
}

export const useCreateDrawerStore = create<CreateDrawerStore>((set) => ({
  shouldOpen: false,
  requestOpen: () => set({ shouldOpen: true }),
  consumeRequest: () => set({ shouldOpen: false }),
}));
