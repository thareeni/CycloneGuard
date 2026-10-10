import axios from 'axios';
import { config } from '../config/env';
import { cacheService } from '../config/redis';
import { dbService } from '../config/database';
import {
  OfficialCycloneResponse,
  IMDIntegrationStatus,
  OfficialCycloneSystem,
  CycloneWarningAlert,
} from '../types/cyclone';

export class IMDCycloneService {
  private readonly portalUrl = 'https://api.imd.gov.in';
  private readonly nodalEmail = 'sankar.nath@imd.gov.in';

  /**
   * Evaluates the integration state and queries verified IMD cyclone tracks/warnings
   */
  public async getOfficialCycloneData(): Promise<OfficialCycloneResponse> {
    const hasKey = Boolean(config.imd.apiKey && config.imd.apiKey.trim().length > 0);
    const cacheKey = 'cycloneguard:imd:cyclone_status';

    // Check cached status
    const cached = await cacheService.get<OfficialCycloneResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // If API credentials are not yet configured
    if (!hasKey) {
      const pendingResponse: OfficialCycloneResponse = {
        integration: {
          provider: 'India Meteorological Department (RSMC New Delhi)',
          apiBaseUrl: config.imd.baseUrl,
          portalUrl: this.portalUrl,
          nodalContact: this.nodalEmail,
          configured: false,
          status: 'PENDING_CREDENTIALS',
          statusDescription:
            'IMD API key is unconfigured. In adherence to disaster safety standards, CycloneGuard does not fabricate fake cyclone tracks or warnings.',
          instructions:
            'To activate live IMD cyclone feeds: 1) Register at https://api.imd.gov.in. 2) Generate an API Key under your developer dashboard (or contact Nodal Officer Dr. Sankar Nath at sankar.nath@imd.gov.in for institutional approval). 3) Set IMD_API_KEY in backend/.env.',
          lastCheckedAt: new Date().toISOString(),
        },
        activeSystemsCount: 0,
        systems: [],
        districtWarnings: [],
        sourceAttribution: 'IMD API Management Platform (api.imd.gov.in) — RSMC New Delhi',
      };

      await cacheService.set(cacheKey, pendingResponse, 300); // 5 min TTL
      return pendingResponse;
    }

    // If API credentials ARE configured, query the official IMD API endpoint
    try {
      const response = await axios.get(`${config.imd.baseUrl}/api/v1/cyclone/active`, {
        headers: {
          'X-Api-Key': config.imd.apiKey,
          Accept: 'application/json',
          'User-Agent': 'CycloneGuard-DisasterManagementSystem/1.0',
        },
        timeout: config.imd.timeoutMs,
      });

      // Process real IMD data if returned
      const data = response.data;
      const systems: OfficialCycloneSystem[] = Array.isArray(data.systems) ? data.systems : [];
      const warnings: CycloneWarningAlert[] = Array.isArray(data.warnings) ? data.warnings : [];

      const activeStatus: OfficialCycloneResponse = {
        integration: {
          provider: 'India Meteorological Department (RSMC New Delhi)',
          apiBaseUrl: config.imd.baseUrl,
          portalUrl: this.portalUrl,
          nodalContact: this.nodalEmail,
          configured: true,
          status: systems.length > 0 ? 'ACTIVE_CYCLONE_TRACKED' : 'NO_ACTIVE_CYCLONE',
          statusDescription:
            systems.length > 0
              ? `${systems.length} official cyclonic system(s) actively tracked by IMD in North Indian Ocean.`
              : 'Official IMD connection verified: No active tropical cyclone or depression systems currently detected over Bay of Bengal / Arabian Sea.',
          instructions: 'Live integration active with official IMD RSMC credentials.',
          lastCheckedAt: new Date().toISOString(),
        },
        activeSystemsCount: systems.length,
        systems,
        districtWarnings: warnings,
        sourceAttribution: 'India Meteorological Department (IMD) - RSMC New Delhi Official API Feed',
      };

      // Persist to database if any active systems were reported
      if (systems.length > 0) {
        this.persistCycloneData(systems, warnings).catch((err) => {
          console.warn('[IMDCycloneService] DB persistence warning:', err.message);
        });
      }

      await cacheService.set(cacheKey, activeStatus, 600); // 10 min cache
      return activeStatus;
    } catch (err: any) {
      console.warn('[IMDCycloneService] IMD API call returned error:', err.message);

      // Distinguish 401 Unauthorized vs Network failure
      const isAuthError = err.response?.status === 401 || err.response?.status === 403;

      const errorResponse: OfficialCycloneResponse = {
        integration: {
          provider: 'India Meteorological Department (RSMC New Delhi)',
          apiBaseUrl: config.imd.baseUrl,
          portalUrl: this.portalUrl,
          nodalContact: this.nodalEmail,
          configured: true,
          status: isAuthError ? 'PENDING_CREDENTIALS' : 'SERVICE_UNAVAILABLE',
          statusDescription: isAuthError
            ? 'Configured IMD API Key was rejected or expired by api.imd.gov.in (HTTP 401/403).'
            : `Could not connect to official IMD API gateway (${err.message}).`,
          instructions:
            'Please verify your API key at https://api.imd.gov.in or check institutional network firewall.',
          lastCheckedAt: new Date().toISOString(),
        },
        activeSystemsCount: 0,
        systems: [],
        districtWarnings: [],
        sourceAttribution: 'IMD RSMC New Delhi (Official Gateway)',
      };

      await cacheService.set(cacheKey, errorResponse, 120);
      return errorResponse;
    }
  }

  /**
   * Persists verified cyclone events into PostgreSQL database
   */
  private async persistCycloneData(systems: OfficialCycloneSystem[], warnings: CycloneWarningAlert[]) {
    if (!dbService.isDbConnected()) return;

    for (const sys of systems) {
      await dbService.query(
        `INSERT INTO cyclone_events (
          official_cyclone_id, name, basin, classification, current_status,
          official_source, origin_type, bulletin_number, bulletin_url, last_updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (official_cyclone_id) DO UPDATE SET
          classification = EXCLUDED.classification,
          current_status = EXCLUDED.current_status,
          last_updated_at = NOW()`,
        [
          sys.officialCycloneId,
          sys.name,
          sys.basin,
          sys.classification,
          sys.currentStatus,
          sys.officialSource,
          sys.originType,
          sys.bulletinNumber || null,
          sys.bulletinUrl || null,
        ]
      );
    }
  }
}

export const imdCycloneService = new IMDCycloneService();
