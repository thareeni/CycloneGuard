import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    baseUrl: process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast',
    timeoutMs: parseInt(process.env.WEATHER_FETCH_TIMEOUT_MS || '7000', 10),
  },

  // India Meteorological Department (IMD) API
  imd: {
    baseUrl: process.env.IMD_API_BASE_URL || 'https://api.imd.gov.in',
    apiKey: process.env.IMD_API_KEY || '',
    timeoutMs: parseInt(process.env.IMD_API_TIMEOUT_MS || '8000', 10),
    nodalContact: 'sankar.nath@imd.gov.in',
    portalUrl: 'https://api.imd.gov.in',
  },
};
