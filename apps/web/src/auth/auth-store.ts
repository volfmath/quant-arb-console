import { create } from 'zustand';

export type UserRole = 'super_admin' | 'trader' | 'risk_manager' | 'viewer';

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  permissions: string[];
};

export type AuthSession = {
  token: string;
  expires_in: number;
  user: AuthUser;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setSession: (session) => set({ token: session.token, user: session.user }),
  logout: () => set({ token: null, user: null }),
}));

