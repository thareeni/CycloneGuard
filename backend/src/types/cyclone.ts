export type CycloneWarningLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface CycloneTrackPoint {
  timepoint: string;
  latitude: number;
  longitude: number;
  centralPressureHpa?: number;
  maxSustainedWindKmh: number;
  gustsKmh?: number;
  intensityStage: string;
  isForecast: boolean;
}

export interface CycloneWarningAlert {
  id: string;
  districtName: string;
  warningLevel: CycloneWarningLevel;
  stageName: string; // 'Pre-Cyclone Watch' | 'Cyclone Alert' | 'Cyclone Warning' | 'Post Landfall Outlook'
  headline: string;
  advisoryDetails: string;
  rainfallWarning?: string;
  windWarning?: string;
  seaConditionWarning?: string;
  fishermenWarning?: string;
  issuedAt: string;
  validUntil?: string;
  source: string;
  originType: 'OFFICIAL_BULLETIN' | 'OFFICIAL_MET_AGENCY';
}

export interface OfficialCycloneSystem {
  officialCycloneId: string;
  name: string;
  basin: string; // e.g. 'Bay of Bengal' | 'Arabian Sea'
  classification: string; // 'Depression' | 'Deep Depression' | 'Cyclonic Storm' | 'Severe Cyclonic Storm' etc.
  currentStatus: 'ACTIVE' | 'DISSIPATED' | 'DE-INTENSIFIED';
  currentPosition?: {
    latitude: number;
    longitude: number;
    centralPressureHpa?: number;
    maxSustainedWindKmh: number;
    movementDirection?: string;
    movementSpeedKmh?: number;
  };
  tracks: CycloneTrackPoint[];
  warnings: CycloneWarningAlert[];
  officialSource: string;
  originType: 'OFFICIAL_MET_AGENCY';
  bulletinNumber?: string;
  bulletinUrl?: string;
  lastUpdatedAt: string;
}

export interface IMDIntegrationStatus {
  provider: string;
  secondaryProvider?: string;
  apiBaseUrl: string;
  portalUrl: string;
  nodalContact: string;
  configured: boolean;
  status:
    | 'PENDING_CREDENTIALS'
    | 'NO_ACTIVE_CYCLONE'
    | 'ACTIVE_CYCLONE_TRACKED'
    | 'SERVICE_UNAVAILABLE'
    | 'STALE_DATA';
  statusDescription: string;
  instructions: string;
  dataFreshness?: 'LIVE_REALTIME' | 'RECENT_CACHE' | 'STALE';
  lastCheckedAt: string;
}

export interface OfficialCycloneResponse {
  integration: IMDIntegrationStatus;
  activeSystemsCount: number;
  systems: OfficialCycloneSystem[];
  districtWarnings: CycloneWarningAlert[];
  sourceAttribution: string;
}
