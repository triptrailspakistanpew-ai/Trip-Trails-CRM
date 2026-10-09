import { create } from 'zustand';

interface ThemeState {
  // If we need additional UI theme state beyond next-themes
  // For now it can be simple or empty, relying mostly on next-themes
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false, // Default will be managed by next-themes
  setIsDark: (isDark) => set({ isDark }),
}));
