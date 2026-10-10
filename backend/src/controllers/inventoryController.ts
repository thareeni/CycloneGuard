import { Request, Response } from 'express';
import { inventoryService } from '../services/inventoryService';

export class InventoryController {
  public async getInventory(req: Request, res: Response) {
    try {
      const shelterId = req.query.shelterId ? parseInt(req.query.shelterId as string, 10) : undefined;
      const items = shelterId
        ? await inventoryService.getInventoryByShelterId(shelterId)
        : await inventoryService.getAllInventory();

      res.json({
        success: true,
        source: 'Tamil Nadu State Relief Warehouse Log',
        originType: 'MANUAL_OPERATIONAL',
        count: items.length,
        data: items,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve relief inventory',
        error: error.message,
      });
    }
  }
}

export const inventoryController = new InventoryController();
