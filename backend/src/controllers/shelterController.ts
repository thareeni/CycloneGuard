import { Request, Response } from 'express';
import { shelterService } from '../services/shelterService';

export class ShelterController {
  public async getShelters(req: Request, res: Response) {
    try {
      const shelters = await shelterService.getAllShelters();
      res.json({
        success: true,
        source: 'District Disaster Management Authority Ground Registry',
        originType: 'MANUAL_OPERATIONAL',
        count: shelters.length,
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
}

export const shelterController = new ShelterController();
