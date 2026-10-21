import { Router } from 'express';
import { weatherController } from '../controllers/weatherController';
import { cycloneController } from '../controllers/cycloneController';
import { shelterController } from '../controllers/shelterController';
import { inventoryController } from '../controllers/inventoryController';
import { mongoInventoryController } from '../controllers/mongoInventoryController';
import { mongoTransferController } from '../controllers/mongoTransferController';
import { districtController } from '../controllers/districtController';
import { authController } from '../controllers/authController';
import { authenticateUser, requireAuth, requireRole, requireDistrictAccess } from '../middleware/auth';
import { dbService } from '../config/database';
import { mongoDbService } from '../config/mongodb';
import { cacheService } from '../config/redis';
import { config } from '../config/env';

const router = Router();

// Apply token extraction to all incoming requests
router.use(authenticateUser);

// ==========================================
// 1. Authentication & Role-Based Access Control
// ==========================================
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));
router.get('/auth/me', requireAuth, (req, res) => authController.getMe(req, res));
router.get('/auth/demo-accounts', (req, res) => authController.getDemoAccounts(req, res));

// Admin-Only Audit Trail
router.get('/audit-logs', requireAuth, requireRole('ADMIN'), (req, res) =>
  authController.getAuditLogs(req, res)
);

// ==========================================
// 2. System Health & Diagnostics (Public)
// ==========================================
router.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'CycloneGuard API Gateway',
    timestamp: new Date().toISOString(),
    components: {
      database: dbService.getStatus(),
      mongodb: mongoDbService.getStatus(),
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
      gdacsFallback: {
        provider: 'Global Disaster Alert and Coordination System (GDACS GeoJSON)',
        status: 'STANDBY_PUBLIC_FALLBACK',
      },
    },
  });
});

// ==========================================
// 3. Centralized Tamil Nadu Coastal Districts (Public)
// ==========================================
router.get('/districts', (req, res) => districtController.getDistricts(req, res));
router.get('/districts/:idOrName', (req, res) => districtController.getDistrictByIdOrName(req, res));

// ==========================================
// 4. Live Weather & Risk Assessment (Public)
// ==========================================
router.get('/weather/coastal', (req, res) => weatherController.getCoastalWeather(req, res));
router.get('/weather/assessment/districts', (req, res) => weatherController.getDistrictRiskSummaries(req, res));
router.get('/weather/assessment', (req, res) => weatherController.getRiskAssessment(req, res));
router.get('/weather/assessment/:stationId', (req, res) => weatherController.getRiskAssessment(req, res));
router.get('/weather/station/:stationId', (req, res) => weatherController.getStationWeather(req, res));

// ==========================================
// 5. Official Cyclone Tracking (Public)
// ==========================================
router.get('/cyclone/status', (req, res) => cycloneController.getCycloneStatus(req, res));

// ==========================================
// 6. Shelters & Evacuation Routing (Public)
// ==========================================
router.get('/shelters/nearest', (req, res) => shelterController.getNearestShelters(req, res));
router.get('/shelters/route', (req, res) => shelterController.getRouteToShelter(req, res));
router.get('/shelters', (req, res) => shelterController.getShelters(req, res));
router.get('/shelters/:id', (req, res) => shelterController.getShelterById(req, res));

// Relational inventory (Read-only baseline)
router.get('/inventory', (req, res) => inventoryController.getInventory(req, res));

// ==========================================
// 7. MERN Stack Module: Relief Inventory (RBAC Protected Writes)
// ==========================================
router.get('/mongo/inventory', (req, res) => mongoInventoryController.getAll(req, res));
router.get('/mongo/inventory/:id', (req, res) => mongoInventoryController.getById(req, res));

// Protected: Only ADMIN or DISTRICT_OFFICIAL in their assigned district
router.post(
  '/mongo/inventory',
  requireAuth,
  requireRole('ADMIN', 'DISTRICT_OFFICIAL'),
  requireDistrictAccess((req) => req.body.districtName || req.body.district),
  (req, res) => mongoInventoryController.create(req, res)
);

router.put(
  '/mongo/inventory/:id',
  requireAuth,
  requireRole('ADMIN', 'DISTRICT_OFFICIAL'),
  requireDistrictAccess((req) => req.body.districtName || req.body.district),
  (req, res) => mongoInventoryController.update(req, res)
);

// Protected: Delete requires ADMIN role
router.delete(
  '/mongo/inventory/:id',
  requireAuth,
  requireRole('ADMIN'),
  (req, res) => mongoInventoryController.delete(req, res)
);

// ==========================================
// 8. MERN Stack Module: Relief Transfers & Analytics (RBAC Protected Writes)
// ==========================================
router.get('/mongo/transfers', (req, res) => mongoTransferController.getAllTransfers(req, res));
router.get('/mongo/transfers/:id', (req, res) => mongoTransferController.getTransferById(req, res));

// Protected: Initiating transfers requires authorized role and district verification
router.post(
  '/mongo/transfers',
  requireAuth,
  requireRole('ADMIN', 'DISTRICT_OFFICIAL'),
  requireDistrictAccess((req) => req.body.destinationDistrict),
  (req, res) => mongoTransferController.createTransfer(req, res)
);

// Protected: Updating transfer status requires authorized role
router.put(
  '/mongo/transfers/:id/status',
  requireAuth,
  requireRole('ADMIN', 'DISTRICT_OFFICIAL'),
  (req, res) => mongoTransferController.updateTransferStatus(req, res)
);

// Consumption burn-rate estimates (Public operational analytics)
router.get('/mongo/consumption', (req, res) => mongoTransferController.getConsumptionEstimates(req, res));

export default router;
