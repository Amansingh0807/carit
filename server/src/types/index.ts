// ===== User Types =====
export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

// ===== Auth Types =====
export interface TokenPayload {
  userId: number;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRecord {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

// ===== Activity Types =====
export type ActivityCategory = 'transportation' | 'energy' | 'food' | 'shopping';

export interface Activity {
  id: number;
  user_id: number;
  category: ActivityCategory;
  activity_type: string;
  value: number;
  unit: string;
  co2_kg: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface ActivityInput {
  category: ActivityCategory;
  activity_type: string;
  value: number;
  unit: string;
  description?: string;
  date: string;
}

// ===== Emission Factors =====
export interface EmissionFactor {
  activity_type: string;
  category: ActivityCategory;
  factor: number; // kg CO2 per unit
  unit: string;
  label: string;
}

// ===== Analytics Types =====
export interface CategoryBreakdown {
  category: ActivityCategory;
  total_co2_kg: number;
  activity_count: number;
}

export interface DailyTrend {
  date: string;
  total_co2_kg: number;
}

export interface AnalyticsSummary {
  total_co2_kg: number;
  category_breakdown: CategoryBreakdown[];
  daily_trends: DailyTrend[];
  activity_count: number;
}

// ===== Achievement Types =====
export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  threshold_type: 'count' | 'streak' | 'reduction';
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  earned_at: string;
  achievement: Achievement;
}

// ===== Streak Types =====
export interface UserStreak {
  id: number;
  user_id: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

// ===== Recommendation Types =====
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  difficulty: DifficultyLevel;
  potential_savings_kg: number;
  icon: string;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
