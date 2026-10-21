import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Normalizes Open-Meteo Base URL so that whether environment variables provide
 * 'https://api.open-meteo.com', 'https://api.open-meteo.com/v1', or 'https://api.open-meteo.com/v1/forecast',
 * the request always targets the valid '/v1/forecast' endpoint without trailing slashes.
 */
export function normalizeOpenMeteoBaseUrl(rawUrl?: string): string {
  const fallback = 'https://api.open-meteo.com/v1/forecast';
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return fallback;
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/forecast')) {
    return trimmed;
  }
  if (trimmed.endsWith('/v1')) {
    return `${trimmed}/forecast`;
  }
  return `${trimmed}/v1/forecast`;
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'cycloneguard',
    user: process.env.DB_USER || 'cyclone_user',
    password: process.env.DB_PASSWORD || 'cyclone_secure_password',
    connectionString: process.env.DATABASE_URL,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    cacheTtlSeconds: parseInt(process.env.WEATHER_CACHE_TTL_SECONDS || '600', 10),
  },

  // Open-Meteo API
  openMeteo: {
    baseUrl: normalizeOpenMeteoBaseUrl(process.env.OPEN_METEO_BASE_URL),
    timeoutMs: parseInt(process.env.WEATHER_FETCH_TIMEOUT_MS || '10000', 10),
  },

  // India Meteorological Department (IMD) API
  imd: {
    baseUrl: process.env.IMD_API_BASE_URL || 'https://api.imd.gov.in',
    apiKey: process.env.IMD_API_KEY || '',
    timeoutMs: parseInt(process.env.IMD_API_TIMEOUT_MS || '8000', 10),
    nodalContact: 'sankar.nath@imd.gov.in',
    portalUrl: 'https://api.imd.gov.in',
  },

  // MongoDB (MERN Stack Database)
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cycloneguard',
    dbName: process.env.MONGODB_DB_NAME || 'cycloneguard',
  },

  // Authentication & Security (Single Authorized Admin)
  auth: {
    adminEmail: (process.env.ADMIN_EMAIL || 'admin@cycloneguard.tn.gov.in').toLowerCase().trim(),
    adminPassword: process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin@Cyclone2026!',
    jwtSecret: process.env.JWT_SECRET || 'cycloneguard-ultra-secure-hmac-sha256-secret-key-2026',
    jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '86400', 10),
  },
};
