import { Request, Response } from 'express';
import { imdCycloneService } from '../services/imdCycloneService';

export class CycloneController {
  /**
   * GET /api/cyclone/status
   * Returns verified IMD RSMC cyclone tracks, official warnings, and provider integration state
   */
  public async getCycloneStatus(req: Request, res: Response) {
    try {
      const data = await imdCycloneService.getOfficialCycloneData();
      res.json({
        success: true,
        ...data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve official cyclone status',
        error: error.message,
      });
    }
  }
}

export const cycloneController = new CycloneController();
