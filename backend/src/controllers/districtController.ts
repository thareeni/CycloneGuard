import { Request, Response } from 'express';
import { TAMIL_NADU_COASTAL_DISTRICTS } from '../constants/districts';
import { dbService } from '../config/database';

export class DistrictController {
  /**
   * GET /api/districts
   * Returns all 14 coastal districts of Tamil Nadu
   */
  public async getDistricts(req: Request, res: Response): Promise<void> {
    try {
      if (dbService.isDbConnected()) {
        const result = await dbService.query(`
          SELECT d.*, 
            COUNT(s.id) as shelter_count,
            COALESCE(SUM(s.total_capacity), 0) as total_shelter_capacity
          FROM districts d
          LEFT JOIN shelters s ON s.district_id = d.id
          GROUP BY d.id
          ORDER BY d.id ASC
        `);
        if (result && result.rows.length > 0) {
          const merged = result.rows.map((row) => {
            const base = TAMIL_NADU_COASTAL_DISTRICTS.find((c) => c.id === row.id);
            return {
              ...base,
              id: row.id,
              name: row.name,
              state: row.state,
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude),
              headquarters: row.headquarters || base?.headquarters,
              emergencyControlRoomPhone: row.emergency_control_room_phone || base?.emergencyControlRoomPhone,
              stationId: base?.stationId || row.name.toLowerCase(),
              coastalZone: base?.coastalZone || 'Tamil Nadu Coastal Corridor',
              isHighRiskZone: base?.isHighRiskZone ?? true,
              totalRegisteredShelters: Number(row.shelter_count) || base?.totalRegisteredShelters || 1,
              baselineShelterCapacity: Number(row.total_shelter_capacity) || base?.baselineShelterCapacity || 1000,
            };
          });

          res.json({
            success: true,
            source: 'PostgreSQL Relational DB',
            originType: 'VERIFIED_BASELINE',
            count: merged.length,
            data: merged,
          });
          return;
        }
      }

      // Return centralized registry baseline
      res.json({
        success: true,
        source: 'CycloneGuard Centralized Registry',
        originType: 'VERIFIED_BASELINE',
        count: TAMIL_NADU_COASTAL_DISTRICTS.length,
        data: TAMIL_NADU_COASTAL_DISTRICTS,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve coastal districts',
        error: (error as Error).message,
      });
    }
  }

  /**
   * GET /api/districts/:idOrName
   */
  public async getDistrictByIdOrName(req: Request, res: Response): Promise<void> {
    const { idOrName } = req.params;
    const isId = !isNaN(Number(idOrName));

    const district = TAMIL_NADU_COASTAL_DISTRICTS.find((d) =>
      isId ? d.id === Number(idOrName) : d.name.toLowerCase() === idOrName.toLowerCase()
    );

    if (!district) {
      res.status(404).json({
        success: false,
        message: `District '${idOrName}' not found in the 14 Tamil Nadu coastal districts registry.`,
      });
      return;
    }

    res.json({
      success: true,
      data: district,
    });
  }
}

export const districtController = new DistrictController();
