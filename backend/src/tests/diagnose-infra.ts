import net from 'net';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { Pool } from 'pg';
import { config } from '../config/env';

async function diagnose() {
  console.log('================================================================');
  console.log(' CycloneGuard Independent Infrastructure Connectivity Diagnostics');
  console.log(' Direct Socket & Protocol Tests (Independent of API Health State)');
  console.log('================================================================\n');

  // 1. PostgreSQL
  console.log('[1/3] Testing PostgreSQL Relational Store:');
  console.log(`      Config: host=${config.db.host}, port=${config.db.port}, db=${config.db.name}, user=${config.db.user}`);
  const pgSocket = await new Promise<{ open: boolean; error?: string }>((resolve) => {
    const s = net.createConnection({ port: config.db.port, host: config.db.host });
    s.setTimeout(2000);
    s.on('connect', () => { s.destroy(); resolve({ open: true }); });
    s.on('error', (e) => resolve({ open: false, error: e.message }));
    s.on('timeout', () => { s.destroy(); resolve({ open: false, error: 'Connection timed out' }); });
  });

  if (!pgSocket.open) {
    console.log(`      ❌ PostgreSQL Socket: Unreachable on ${config.db.host}:${config.db.port} (${pgSocket.error})`);
    console.log('      ℹ️  Root Cause: Local PostgreSQL service is not running or port is blocked.');
    console.log('      🛡️  Resilience Behavior: System automatically falls back to in-memory verified baseline tables.');
  } else {
    console.log(`      ✅ PostgreSQL Socket: Connected on port ${config.db.port}`);
    try {
      const pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
        connectionTimeoutMillis: 3000,
      });
      const client = await pool.connect();
      const res = await client.query('SELECT current_database(), version()');
      client.release();
      await pool.end();
      console.log(`      ✅ PostgreSQL Database Auth: Connected to ${res.rows[0].current_database}`);
    } catch (e: any) {
      console.log(`      ⚠️ PostgreSQL Auth/Query Error: ${e.message}`);
    }
  }

  // 2. Redis
  console.log('\n[2/3] Testing Redis Cache Store:');
  console.log(`      Config: url=${config.redis.url}`);
  const redisSocket = await new Promise<{ open: boolean; error?: string }>((resolve) => {
    const s = net.createConnection({ port: 6379, host: '127.0.0.1' });
    s.setTimeout(2000);
    s.on('connect', () => { s.destroy(); resolve({ open: true }); });
    s.on('error', (e) => resolve({ open: false, error: e.message }));
    s.on('timeout', () => { s.destroy(); resolve({ open: false, error: 'Connection timed out' }); });
  });

  if (!redisSocket.open) {
    console.log(`      ❌ Redis Socket: Unreachable on 127.0.0.1:6379 (${redisSocket.error})`);
    console.log('      ℹ️  Root Cause: Local Redis server daemon is not active on host.');
    console.log('      🛡️  Resilience Behavior: System seamlessly uses CacheService in-memory TTL Map cache (WEATHER_CACHE_TTL_SECONDS=600).');
  } else {
    console.log('      ✅ Redis Socket: Connected on port 6379');
    try {
      const client = createClient({ url: config.redis.url });
      await client.connect();
      const ping = await client.ping();
      await client.disconnect();
      console.log(`      ✅ Redis Ping: ${ping}`);
    } catch (e: any) {
      console.log(`      ⚠️ Redis Client Error: ${e.message}`);
    }
  }

  // 3. MongoDB Atlas
  console.log('\n[3/3] Testing MongoDB Atlas Cloud Cluster:');
  const redactedUri = config.mongodb.uri.replace(/\/\/.*@/, '//<credentials>@');
  console.log(`      Config: URI=${redactedUri}, DB=${config.mongodb.dbName}`);
  try {
    const start = Date.now();
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    const pingRes = await mongoose.connection.db?.admin().ping();
    const elapsed = Date.now() - start;
    console.log(`      ✅ MongoDB Atlas Ping: SUCCESS in ${elapsed}ms (cluster responsive)`);
    console.log(`      Database collections: ${JSON.stringify(pingRes)}`);
    await mongoose.disconnect();
  } catch (e: any) {
    console.log(`      ❌ MongoDB Atlas: Connection Failed (${e.message})`);
    console.log('      ℹ️  Root Cause: IP access restriction or network firewall on MongoDB Atlas cluster.');
    console.log('      🛡️  Resilience Behavior: Controller falls back to in-memory authentic stockpile items & memory audit logs.');
  }

  console.log('\n================================================================\n');
}

diagnose().catch((e) => {
  console.error('Diagnostic error:', e);
  process.exit(1);
});
