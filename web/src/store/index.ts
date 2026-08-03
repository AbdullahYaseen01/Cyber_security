import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TierId } from "@/lib/tiers";

interface UserState {
  id: string;
  email: string;
  name: string | null;
  orgId: string;
  orgName: string;
  role: string;
  tier: TierId;
  subscriptionStatus: string;
  scansUsed: number;
  scansLimit: number;
  isDemo?: boolean;
}

interface UIState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
}

interface AuthStore {
  user: UserState | null;
  setUser: (user: UserState | null) => void;
  isAuthenticated: () => boolean;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "qs-ui" }
  )
);

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAuthenticated: () => get().user !== null,
}));
