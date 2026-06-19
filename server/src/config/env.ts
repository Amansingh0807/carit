import dotenv from 'dotenv';
import path from 'path';

export function loadConfig(): void {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  dbPath: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };
  cors: {
    origin: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  bcryptRounds: number;
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getConfig(): AppConfig {
  return {
    port: parseInt(getEnvVar('PORT', '3001'), 10),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    dbPath: getEnvVar('DB_PATH', './data/carbon_footprint.db'),
    jwt: {
      accessSecret: getEnvVar('JWT_ACCESS_SECRET'),
      refreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
      accessExpiry: getEnvVar('JWT_ACCESS_EXPIRY', '15m'),
      refreshExpiry: getEnvVar('JWT_REFRESH_EXPIRY', '7d'),
    },
    cors: {
      origin: getEnvVar('CORS_ORIGIN', 'http://localhost:5173'),
    },
    rateLimit: {
      windowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '900000'), 10),
      max: parseInt(getEnvVar('RATE_LIMIT_MAX', '100'), 10),
    },
    bcryptRounds: parseInt(getEnvVar('BCRYPT_ROUNDS', '12'), 10),
  };
}
