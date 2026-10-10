import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes/api';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Permissive for local development & Vite frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root welcome route
app.get('/', (req: Request, res: Response) => {
  res.json({
    app: 'CycloneGuard — Real-Time Cyclone Disaster Management System',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      health: '/api/health',
      liveWeatherCoastal: '/api/weather/coastal',
      officialCycloneStatus: '/api/cyclone/status',
      groundShelters: '/api/shelters',
      groundReliefInventory: '/api/inventory',
    },
  });
});

// Mount API routes
app.use('/api', apiRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.url} not found`,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

const server = app.listen(config.port, () => {
  console.log('====================================================');
  console.log(` CycloneGuard Backend Service active on port ${config.port}`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Health check: http://localhost:${config.port}/api/health`);
  console.log(` Coastal Weather: http://localhost:${config.port}/api/weather/coastal`);
  console.log(` Cyclone Status: http://localhost:${config.port}/api/cyclone/status`);
  console.log('====================================================');
});

// Graceful termination
const shutdown = () => {
  console.log('\n[Server] Gracefully shutting down CycloneGuard service...');
  server.close(() => {
    console.log('[Server] HTTP connections closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
