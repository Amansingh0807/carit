import { create } from 'zustand';
import api, { setStoredTokens, clearStoredTokens, getStoredTokens } from '../services/api';
import type { User, LoginCredentials, RegisterCredentials, ApiResponse } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>>(
        '/api/auth/login',
        credentials
      );
      if (response.data.success && response.data.data) {
        const { user, tokens } = response.data.data;
        setStoredTokens(tokens.accessToken, tokens.refreshToken);
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      } else {
        set({ isLoading: false, error: response.data.message ?? 'Login failed' });
      }
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const message = errors && Array.isArray(errors)
        ? errors.join(', ')
        : (err.response?.data?.message ?? 'Invalid email or password');
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>>(
        '/api/auth/register',
        credentials
      );
      if (response.data.success && response.data.data) {
        const { user, tokens } = response.data.data;
        setStoredTokens(tokens.accessToken, tokens.refreshToken);
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      } else {
        set({ isLoading: false, error: response.data.message ?? 'Registration failed' });
      }
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const message = errors && Array.isArray(errors)
        ? errors.join(', ')
        : (err.response?.data?.message ?? 'Email or username already exists');
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const { refreshToken } = getStoredTokens();
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error on backend:', err);
    } finally {
      clearStoredTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const response = await api.get<ApiResponse<{ user: User }>>('/api/auth/me');
      if (response.data.success && response.data.data) {
        set({ user: response.data.data.user, isAuthenticated: true, isLoading: false });
      } else {
        clearStoredTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err) {
      clearStoredTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
