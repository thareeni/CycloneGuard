import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './env';
import fs from 'fs';
import path from 'path';

class DatabaseService {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor() {
    this.initPool();
  }

  private async initPool() {
    try {
      this.pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
        connectionTimeoutMillis: 3000,
        max: 10,
      });

      this.pool.on('error', (err) => {
        console.warn('[Database] Unexpected PostgreSQL client error:', err.message);
        this.isConnected = false;
      });

      const client = await this.pool.connect();
      this.isConnected = true;
      client.release();
      console.log(`[Database] PostgreSQL connected successfully to ${config.db.name} at ${config.db.host}:${config.db.port}`);

      // Auto-run schema migrations if tables don't exist
      await this.runMigrations();
    } catch (err: any) {
      console.warn(`[Database] PostgreSQL connection failed (${err.message}). Ground data endpoints will operate using initial operational seeds until database is connected.`);
      this.isConnected = false;
    }
  }

  public async runMigrations() {
    if (!this.pool || !this.isConnected) return;
    try {
      const schemaPath = path.resolve(__dirname, '../db/schema.sql');
      const seedPath = path.resolve(__dirname, '../db/seed.sql');

      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await this.pool.query(schemaSql);
        console.log('[Database] Schema verified/migrated successfully.');
      }

      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await this.pool.query(seedSql);
        console.log('[Database] Operational baseline seeds verified.');
      }
    } catch (err: any) {
      console.error('[Database] Migration error:', err.message);
    }
  }

  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T> | null> {
    if (!this.pool || !this.isConnected) {
      return null;
    }
    try {
      return await this.pool.query<T>(text, params);
    } catch (err: any) {
      console.error('[Database] Query execution failed:', err.message);
      return null;
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
    };
  }

  public isDbConnected(): boolean {
    return this.isConnected;
  }
}

export const dbService = new DatabaseService();
