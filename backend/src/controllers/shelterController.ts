import { Request, Response } from 'express';
import { shelterService } from '../services/shelterService';

export class ShelterController {
  public async getShelters(req: Request, res: Response) {
    try {
      const districtFilter = req.query.district as string | undefined;
      const shelters = await shelterService.getAllShelters(districtFilter);
      res.json({
        success: true,
        source: 'District Disaster Management Authority Ground Registry',
        originType: 'MANUAL_OPERATIONAL',
        verificationStatus: 'VERIFIED_BASELINE',
        count: shelters.length,
        districtFilter: districtFilter || 'ALL',
        data: shelters,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve shelter directory',
        error: error.message,
      });
    }
  }

  public async getShelterById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const shelter = await shelterService.getShelterById(id);
      if (!shelter) {
        return res.status(404).json({ success: false, message: 'Shelter not found' });
      }
      res.json({
        success: true,
        source: 'District Disaster Management Authority Ground Registry',
        originType: 'MANUAL_OPERATIONAL',
        data: shelter,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve shelter',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/shelters/nearest?lat=13.08&lng=80.27&limit=50&radius=100
   */
  public async getNearestShelters(req: Request, res: Response) {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid origin coordinates. Please provide valid numeric lat (-90 to 90) and lng (-180 to 180).',
        });
      }

      const recommendations = await shelterService.getNearestShelters(lat, lng, limit, radius);
      res.json({
        success: true,
        source: 'CycloneGuard Evacuation Planning & OSRM Engine',
        origin: { latitude: lat, longitude: lng },
        radiusKm: radius,
        recommendationsCount: recommendations.length,
        recommendations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compute nearest shelters',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/shelters/route?originLat=13.0&originLng=80.2&shelterId=1
   */
  public async getRouteToShelter(req: Request, res: Response) {
    try {
      const originLat = parseFloat(req.query.originLat as string);
      const originLng = parseFloat(req.query.originLng as string);
      const shelterId = parseInt(req.query.shelterId as string, 10);

      if (isNaN(originLat) || isNaN(originLng) || isNaN(shelterId)) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid parameters: originLat, originLng, and shelterId are required.',
        });
      }

      const shelter = await shelterService.getShelterById(shelterId);
      if (!shelter) {
        return res.status(404).json({ success: false, message: 'Shelter not found' });
      }

      const route = await shelterService.computeRoute(originLat, originLng, shelter.latitude, shelter.longitude);
      res.json({
        success: true,
        shelter: {
          id: shelter.id,
          name: shelter.name,
          district: shelter.districtName,
          address: shelter.address,
        },
        route,
        safetyDisclaimer:
          'EVACUATION ROUTE ADVISORY: Real-time road inundation, tree fall, and power-line hazard data are not linked to this route. Responders and evacuees must check with local district control rooms before traversing coastal corridors.',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compute route to shelter',
        error: error.message,
      });
    }
  }
}

export const shelterController = new ShelterController();
