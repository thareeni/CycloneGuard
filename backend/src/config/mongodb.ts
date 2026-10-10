import mongoose from 'mongoose';
import { config } from './env';

class MongoDatabaseService {
  private isConnected = false;
  private connectionError: string | null = null;

  constructor() {
    this.initMongo();
  }

  private async initMongo() {
    try {
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        this.connectionError = null;
        console.log(`[MongoDB] Connected successfully to ${config.mongodb.dbName}`);
      });

      mongoose.connection.on('error', (err) => {
        this.isConnected = false;
        this.connectionError = err.message;
        console.warn(`[MongoDB] Connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        console.warn('[MongoDB] Disconnected from server');
      });

      // Attempt initial connection with quick timeout so it never blocks backend startup
      await mongoose.connect(config.mongodb.uri, {
        dbName: config.mongodb.dbName,
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500,
      });

      this.isConnected = true;
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err.message;
      console.warn(`[MongoDB] Standby mode (${err.message}). Inventory endpoints will operate with resilient operational baseline until live MongoDB daemon is connected.`);
    }
  }

  public isMongoConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getStatus() {
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    return {
      connected: this.isMongoConnected(),
      state: states[mongoose.connection.readyState] || 'Unknown',
      uri: config.mongodb.uri.replace(/\/\/.*@/, '//<credentials>@'), // Redact credentials if present
      dbName: config.mongodb.dbName,
      error: this.connectionError,
    };
  }
}

export const mongoDbService = new MongoDatabaseService();
