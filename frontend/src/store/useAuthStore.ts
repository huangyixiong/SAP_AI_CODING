import { create } from 'zustand';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  hasPermission: (code: string) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,

  setAuth: (accessToken, user) => set({ accessToken, user }),

  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({ accessToken: null, user: null });
  },

  hasPermission: (code) => get().user?.permissions.includes(code) ?? false,
  isAdmin: () => get().user?.roles.includes('admin') ?? false,
}));
