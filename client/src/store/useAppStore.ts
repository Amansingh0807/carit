import { create } from 'zustand';
import api from '../services/api';
import type {
  Activity,
  ActivityInput,
  EmissionFactor,
  AnalyticsSummary,
  Recommendation,
  UserAchievement,
  UserStreak,
  ApiResponse,
  PaginatedResponse,
} from '../types';

interface AppState {
  activities: Activity[];
  totalActivities: number;
  currentPage: number;
  activitiesLimit: number;
  activityLoading: boolean;
  activityError: string | null;

  emissionFactors: EmissionFactor[];
  emissionFactorsLoading: boolean;

  analyticsSummary: AnalyticsSummary | null;
  analyticsLoading: boolean;
  analyticsRange: '7days' | '30days' | '1year' | 'all';

  recommendations: Recommendation[];
  recommendationsLoading: boolean;

  achievements: { earned: UserAchievement[]; available: any[] };
  achievementsLoading: boolean;

  streak: UserStreak | null;
  streakLoading: boolean;

  // Actions
  fetchActivities: (page?: number, limit?: number, category?: string) => Promise<void>;
  logActivity: (input: ActivityInput) => Promise<void>;
  updateActivity: (id: number, input: ActivityInput) => Promise<void>;
  deleteActivity: (id: number) => Promise<void>;
  
  fetchEmissionFactors: (category?: string) => Promise<void>;
  fetchAnalyticsSummary: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchStreak: () => Promise<void>;
  
  setAnalyticsRange: (range: '7days' | '30days' | '1year' | 'all') => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activities: [],
  totalActivities: 0,
  currentPage: 1,
  activitiesLimit: 10,
  activityLoading: false,
  activityError: null,

  emissionFactors: [],
  emissionFactorsLoading: false,

  analyticsSummary: null,
  analyticsLoading: false,
  analyticsRange: '7days',

  recommendations: [],
  recommendationsLoading: false,

  achievements: { earned: [], available: [] },
  achievementsLoading: false,

  streak: null,
  streakLoading: false,

  // Actions
  fetchActivities: async (page = 1, limit = 10, category) => {
    set({ activityLoading: true, activityError: null });
    try {
      let url = `/api/activities?page=${page}&limit=${limit}`;
      if (category) {
        url += `&category=${category}`;
      }
      const response = await api.get<PaginatedResponse<Activity>>(url);
      if (response.data.success && response.data.data) {
        set({
          activities: response.data.data,
          currentPage: page,
          activitiesLimit: limit,
          totalActivities: response.data.pagination.total,
          activityLoading: false,
        });
      } else {
        set({ activityLoading: false, activityError: response.data.message ?? 'Failed to load activities' });
      }
    } catch (err: any) {
      set({ activityLoading: false, activityError: err.response?.data?.message ?? 'Failed to load activities' });
    }
  },

  logActivity: async (input) => {
    set({ activityLoading: true, activityError: null });
    try {
      const response = await api.post<ApiResponse<{ activity: Activity }>>('/api/activities', input);
      if (response.data.success && response.data.data) {
        set({ activityLoading: false });
        // Refresh dependencies
        await get().fetchActivities(get().currentPage, get().activitiesLimit);
        await get().fetchAnalyticsSummary();
        await get().fetchStreak();
        await get().fetchAchievements();
        await get().fetchRecommendations();
      } else {
        set({ activityLoading: false, activityError: response.data.message ?? 'Failed to log activity' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Failed to log activity';
      set({ activityLoading: false, activityError: msg });
      throw err;
    }
  },

  updateActivity: async (id, input) => {
    set({ activityLoading: true, activityError: null });
    try {
      const response = await api.put<ApiResponse<{ activity: Activity }>>(`/api/activities/${id}`, input);
      if (response.data.success && response.data.data) {
        set({ activityLoading: false });
        // Refresh dependencies
        await get().fetchActivities(get().currentPage, get().activitiesLimit);
        await get().fetchAnalyticsSummary();
        await get().fetchAchievements();
        await get().fetchRecommendations();
      } else {
        set({ activityLoading: false, activityError: response.data.message ?? 'Failed to update activity' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Failed to update activity';
      set({ activityLoading: false, activityError: msg });
      throw err;
    }
  },

  deleteActivity: async (id) => {
    set({ activityLoading: true, activityError: null });
    try {
      const response = await api.delete<ApiResponse<null>>(`/api/activities/${id}`);
      if (response.data.success) {
        set({ activityLoading: false });
        // Refresh dependencies
        await get().fetchActivities(get().currentPage, get().activitiesLimit);
        await get().fetchAnalyticsSummary();
        await get().fetchStreak();
        await get().fetchAchievements();
        await get().fetchRecommendations();
      } else {
        set({ activityLoading: false, activityError: response.data.message ?? 'Failed to delete activity' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Failed to delete activity';
      set({ activityLoading: false, activityError: msg });
      throw err;
    }
  },

  fetchEmissionFactors: async (category) => {
    set({ emissionFactorsLoading: true });
    try {
      let url = '/api/activities/emission-factors';
      if (category) {
        url += `?category=${category}`;
      }
      const response = await api.get<ApiResponse<EmissionFactor[]>>(url);
      if (response.data.success && response.data.data) {
        set({ emissionFactors: response.data.data, emissionFactorsLoading: false });
      } else {
        set({ emissionFactorsLoading: false });
      }
    } catch (err) {
      set({ emissionFactorsLoading: false });
    }
  },

  fetchAnalyticsSummary: async () => {
    set({ analyticsLoading: true });
    try {
      const range = get().analyticsRange;
      let url = '/api/analytics/summary';
      
      if (range !== 'all') {
        const endDate = new Date().toISOString().split('T')[0];
        const start = new Date();
        if (range === '7days') {
          start.setDate(start.getDate() - 7);
        } else if (range === '30days') {
          start.setDate(start.getDate() - 30);
        } else if (range === '1year') {
          start.setDate(start.getDate() - 365);
        }
        const startDate = start.toISOString().split('T')[0];
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await api.get<ApiResponse<AnalyticsSummary>>(url);
      if (response.data.success && response.data.data) {
        set({ analyticsSummary: response.data.data, analyticsLoading: false });
      } else {
        set({ analyticsLoading: false });
      }
    } catch (err) {
      set({ analyticsLoading: false });
    }
  },

  fetchRecommendations: async () => {
    set({ recommendationsLoading: true });
    try {
      const response = await api.get<ApiResponse<Recommendation[]>>('/api/recommendations');
      if (response.data.success && response.data.data) {
        set({ recommendations: response.data.data, recommendationsLoading: false });
      } else {
        set({ recommendationsLoading: false });
      }
    } catch (err) {
      set({ recommendationsLoading: false });
    }
  },

  fetchAchievements: async () => {
    set({ achievementsLoading: true });
    try {
      const response = await api.get<ApiResponse<{ earned: UserAchievement[]; available: any[] }>>('/api/gamification/achievements');
      if (response.data.success && response.data.data) {
        set({ achievements: response.data.data, achievementsLoading: false });
      } else {
        set({ achievementsLoading: false });
      }
    } catch (err) {
      set({ achievementsLoading: false });
    }
  },

  fetchStreak: async () => {
    set({ streakLoading: true });
    try {
      const response = await api.get<ApiResponse<UserStreak>>('/api/gamification/streak');
      if (response.data.success && response.data.data) {
        set({ streak: response.data.data, streakLoading: false });
      } else {
        set({ streakLoading: false });
      }
    } catch (err) {
      set({ streakLoading: false });
    }
  },

  setAnalyticsRange: (range) => {
    set({ analyticsRange: range });
    get().fetchAnalyticsSummary();
  },

  resetAll: () => {
    set({
      activities: [],
      totalActivities: 0,
      currentPage: 1,
      analyticsSummary: null,
      recommendations: [],
      achievements: { earned: [], available: [] },
      streak: null,
    });
  },
}));
