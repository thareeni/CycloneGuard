import { Request, Response } from 'express';
import { openMeteoService } from '../services/openMeteoService';
import { TAMIL_NADU_COASTAL_STATIONS } from '../types/weather';

export class WeatherController {
  /**
   * GET /api/weather/coastal
   * Retrieves live weather observations for all Tamil Nadu coastal monitoring stations
   */
  public async getCoastalWeather(req: Request, res: Response) {
    try {
      const refresh = req.query.refresh === 'true';
      const observations = await openMeteoService.getAllCoastalStationsWeather(refresh);
      
      res.json({
        success: true,
        source: 'Open-Meteo API',
        originType: 'LIVE_API',
        count: observations.length,
        timestamp: new Date().toISOString(),
        stations: observations,
        data: observations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve coastal weather data',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/weather/station/:stationId
   */
  public async getStationWeather(req: Request, res: Response) {
    try {
      const { stationId } = req.params;
      const station = TAMIL_NADU_COASTAL_STATIONS.find(
        (s) => s.id.toLowerCase() === stationId.toLowerCase()
      );

      if (!station) {
        return res.status(404).json({
          success: false,
          message: `Station '${stationId}' not found. Available stations: ${TAMIL_NADU_COASTAL_STATIONS.map((s) => s.id).join(', ')}`,
        });
      }

      const refresh = req.query.refresh === 'true';
      const observation = await openMeteoService.getStationWeather(station, refresh);

      res.json({
        success: true,
        source: 'Open-Meteo API',
        originType: 'LIVE_API',
        data: observation,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: `Failed to retrieve weather for station ${req.params.stationId}`,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/weather/assessment/:stationId?
   * Evaluates transparent rule-based weather impact estimate using live weather data
   */
  public async getRiskAssessment(req: Request, res: Response) {
    try {
      const { stationId } = req.params;
      const refresh = req.query.refresh === 'true';

      if (stationId) {
        const station = TAMIL_NADU_COASTAL_STATIONS.find(
          (s) => s.id.toLowerCase() === stationId.toLowerCase()
        );

        if (!station) {
          return res.status(404).json({
            success: false,
            message: `Station '${stationId}' not found. Available stations: ${TAMIL_NADU_COASTAL_STATIONS.map((s) => s.id).join(', ')}`,
          });
        }

        const assessment = await openMeteoService.getStationAssessment(station, refresh);
        return res.json({
          success: true,
          methodology: 'Rule-Based Deterministic Meteorological Matrix (IMD/WMO Criteria)',
          aiDisclaimer: 'Calculated using transparent physical threshold rules, NOT AI/ML model output.',
          data: assessment,
        });
      }

      // Assess all stations
      const observations = await openMeteoService.getAllCoastalStationsWeather(refresh);
      const assessments = observations.map((obs) => openMeteoService.computeRuleBasedAssessment(obs));

      return res.json({
        success: true,
        methodology: 'Rule-Based Deterministic Meteorological Matrix (IMD/WMO Criteria)',
        aiDisclaimer: 'Calculated using transparent physical threshold rules, NOT AI/ML model output.',
        count: assessments.length,
        data: assessments,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compute risk assessment',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/weather/assessment/districts
   * Statewide risk summary across all 14 coastal districts
   */
  public async getDistrictRiskSummaries(req: Request, res: Response) {
    try {
      const refresh = req.query.refresh === 'true';
      const summaries = await openMeteoService.getDistrictRiskSummaries(refresh);
      res.json({
        success: true,
        methodology: 'Rule-Based Deterministic Meteorological Matrix (IMD/WMO Criteria)',
        aiDisclaimer: 'Calculated using transparent physical threshold rules, NOT AI/ML model output.',
        count: summaries.length,
        districtsCount: summaries.length,
        data: summaries,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve district risk summaries',
        error: error.message,
      });
    }
  }
}

export const weatherController = new WeatherController();
