import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";
import { parseApiError } from "@/lib/error-parser";
import { showError } from "@/lib/toast-utils";
import { useBranchStore } from "./branch.store";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  serverError: string | null;

  // Actions
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setServerError: (error: string | null) => void;

  // Async actions (implementations delegated to api-client to avoid circular deps)
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

// These will be injected by the api-client after it's initialised
var _loginFn: (email: string, password: string) => Promise<User>;
var _logoutFn: () => Promise<void>;
var _getMeFn: () => Promise<User>;

export function injectAuthActions(
  loginFn: typeof _loginFn,
  logoutFn: typeof _logoutFn,
  getMeFn: typeof _getMeFn
) {
  _loginFn = loginFn;
  _logoutFn = logoutFn;
  _getMeFn = getMeFn;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start loading as true to prevent premature redirects
      serverError: null,

      setUser: (user) => {
        set({ user, isAuthenticated: true, serverError: null });
        const currentBranch = useBranchStore.getState().activeBranchId;
        if (user.branchId && (!currentBranch || currentBranch === "all")) {
          useBranchStore.getState().setActiveBranch(user.branchId, user.branch?.currency);
        }
      },
      clearUser: () => set({ user: null, isAuthenticated: false, serverError: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      setServerError: (error) => set({ serverError: error }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const user = await _loginFn(email, password);
          set({ user, isAuthenticated: true, serverError: null });
          if (user.branchId) {
            useBranchStore.getState().setActiveBranch(user.branchId, user.branch?.currency);
          }
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          if (_logoutFn) await _logoutFn();
        } finally {
          get().clearUser();
          set({ isLoading: false });
        }
      },

      fetchMe: async () => {
        if (!_getMeFn) return;
        set({ isLoading: true });
        try {
          const user = await _getMeFn();
          set({ user, isAuthenticated: true, serverError: null });
          const currentBranch = useBranchStore.getState().activeBranchId;
          if (user.branchId && (!currentBranch || currentBranch === "all")) {
            useBranchStore.getState().setActiveBranch(user.branchId, user.branch?.currency);
          }
        } catch (err: any) {
          const parsed = parseApiError(err);

          if (parsed.code === "UNAUTHORIZED") {
            // Session expired or no valid session — silently clear
            set({ user: null, isAuthenticated: false, serverError: null });
          } else if (parsed.code === "SERVER_UNAVAILABLE" || parsed.code === "OFFLINE") {
            // Server is down or user is offline
            set({ serverError: parsed.description });
            showError(err, { context: "Checking authentication" });
          }
          // Other errors are silently ignored during initial auth check
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "tf-auth-user",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
