import { createClient, RedisClientType } from 'redis';
import { config } from './env';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

class CacheService {
  private redisClient: RedisClientType | null = null;
  private isConnected = false;
  private memoryCache = new Map<string, CacheEntry>();

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 3000,
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              // Stop spamming reconnect attempts if Redis is not running locally
              return false;
            }
            return Math.min(retries * 500, 3000);
          },
        },
      });

      this.redisClient.on('error', (err) => {
        if (this.isConnected) {
          console.warn('[Redis] Connection lost. Falling back to memory cache:', err.message);
        }
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('[Redis] Connecting...');
      });

      this.redisClient.on('ready', () => {
        this.isConnected = true;
        console.log('[Redis] Connected and ready at', config.redis.url);
      });

      await this.redisClient.connect().catch((err) => {
        console.warn('[Redis] Initial connection failed. Operating with memory cache fallback:', err.message);
        this.isConnected = false;
      });
    } catch (err: any) {
      console.warn('[Redis] Client initialization skipped. In-memory cache fallback active:', err.message);
      this.isConnected = false;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.isConnected && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch (err: any) {
        console.warn(`[Redis] Get failed for "${key}". Checking memory fallback:`, err.message);
      }
    }

    // In-memory fallback
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    try {
      return JSON.parse(item.value) as T;
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, data: T, ttlSeconds: number = config.redis.cacheTtlSeconds): Promise<void> {
    const stringified = JSON.stringify(data);

    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, stringified);
        return;
      } catch (err: any) {
        console.warn(`[Redis] Set failed for "${key}". Falling back to memory:`, err.message);
      }
    }

    // In-memory fallback
    this.memoryCache.set(key, {
      value: stringified,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public async del(key: string): Promise<void> {
    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err: any) {
        console.warn(`[Redis] Del failed for "${key}":`, err.message);
      }
    }
    this.memoryCache.delete(key);
  }

  public getStatus() {
    return {
      type: this.isConnected ? 'REDIS' : 'IN_MEMORY_FALLBACK',
      connected: this.isConnected,
      url: config.redis.url,
      ttlDefaultSeconds: config.redis.cacheTtlSeconds,
      memoryKeysCount: this.memoryCache.size,
    };
  }
}

export const cacheService = new CacheService();
