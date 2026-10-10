import { Router } from 'express';
import { weatherController } from '../controllers/weatherController';
import { cycloneController } from '../controllers/cycloneController';
import { shelterController } from '../controllers/shelterController';
import { inventoryController } from '../controllers/inventoryController';
import { dbService } from '../config/database';
import { cacheService } from '../config/redis';
import { config } from '../config/env';

const router = Router();

// System Health & Data Source Diagnostics
router.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'CycloneGuard API Gateway',
    timestamp: new Date().toISOString(),
    components: {
      database: dbService.getStatus(),
      cache: cacheService.getStatus(),
      openMeteo: {
        provider: 'Open-Meteo Free Weather API',
        url: config.openMeteo.baseUrl,
        authRequired: false,
        status: 'OPERATIONAL',
      },
      imd: {
        provider: 'India Meteorological Department (api.imd.gov.in)',
        portalUrl: config.imd.portalUrl,
        configured: Boolean(config.imd.apiKey),
        status: config.imd.apiKey ? 'CONFIGURED' : 'PENDING_CREDENTIALS',
      },
    },
  });
});

// Live Weather (Open-Meteo Integration)
router.get('/weather/coastal', (req, res) => weatherController.getCoastalWeather(req, res));
router.get('/weather/station/:stationId', (req, res) => weatherController.getStationWeather(req, res));

// Official Cyclone Tracking (IMD API Interface)
router.get('/cyclone/status', (req, res) => cycloneController.getCycloneStatus(req, res));

// Ground Operational Data: Shelters (Manual Operational)
router.get('/shelters', (req, res) => shelterController.getShelters(req, res));
router.get('/shelters/:id', (req, res) => shelterController.getShelterById(req, res));

// Ground Operational Data: Relief Inventory (Manual Operational)
router.get('/inventory', (req, res) => inventoryController.getInventory(req, res));

export default router;
