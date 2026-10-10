export interface HourlyForecastPoint {
  time: string;
  temperature: number;
  rainfall: number;
  windSpeed: number;
  windGusts: number;
}

export interface LiveWeatherObservation {
  stationId: string;
  locationName: string;
  district: string;
  latitude: number;
  longitude: number;
  temperatureCelsius: number;
  apparentTemperatureCelsius: number;
  humidityPct: number;
  surfacePressureHpa: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustsKmh: number;
  rainfallMm: number;
  precipitationMm: number;
  weatherCode: number;
  weatherCondition: string;
  isDay: boolean;
  cycloneRiskIndex: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  observedAt: string;
  hourlyForecast: HourlyForecastPoint[];
  metadata: {
    source: string;
    originType: 'LIVE_API';
    providerUrl: string;
    lastUpdated: string;
    cached: boolean;
  };
}

export interface IMDIntegrationStatus {
  provider: string;
  apiBaseUrl: string;
  portalUrl: string;
  nodalContact: string;
  configured: boolean;
  status: 'PENDING_CREDENTIALS' | 'NO_ACTIVE_CYCLONE' | 'ACTIVE_CYCLONE_TRACKED' | 'SERVICE_UNAVAILABLE';
  statusDescription: string;
  instructions: string;
  lastCheckedAt: string;
}

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
  warningLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  stageName: string;
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
  basin: string;
  classification: string;
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

export interface CycloneStatusResponse {
  success: boolean;
  integration: IMDIntegrationStatus;
  activeSystemsCount: number;
  systems: OfficialCycloneSystem[];
  districtWarnings: CycloneWarningAlert[];
  sourceAttribution: string;
}

export type ShelterStatus = 'STANDBY' | 'OPEN' | 'FULL' | 'CLOSED';

export interface Shelter {
  id: number;
  districtId: number;
  districtName: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalCapacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
  status: ShelterStatus;
  facilities: {
    hasGenerator: boolean;
    hasMedicalPost: boolean;
    hasDrinkingWater: boolean;
  };
  contactPerson: string;
  contactPhone: string;
  originType: 'MANUAL_OPERATIONAL';
  dataSource: string;
  lastInspectedAt: string;
}

export type InventoryCategory =
  | 'FOOD_RATIONS'
  | 'DRINKING_WATER'
  | 'MEDICAL_KITS'
  | 'BEDDING_BLANKETS'
  | 'GENERATORS_FUEL'
  | 'TARPAULIN_SHEETS';

export type StockStatus = 'SUFFICIENT' | 'LOW' | 'CRITICAL' | 'DEPLETED';

export interface ReliefInventoryItem {
  id: number;
  shelterId: number;
  shelterName: string;
  districtName: string;
  category: InventoryCategory;
  itemName: string;
  quantity: number;
  unit: string;
  criticalThreshold: number;
  stockStatus: StockStatus;
  notes?: string;
  originType: 'MANUAL_OPERATIONAL';
  dataSource: string;
  lastUpdatedAt: string;
}

export interface SystemHealthResponse {
  status: string;
  service: string;
  timestamp: string;
  components: {
    database: { connected: boolean; host: string; database: string };
    mongodb?: { connected: boolean; state: string; uri: string; dbName: string; error?: string | null };
    cache: { type: string; connected: boolean; url: string; memoryKeysCount: number };
    openMeteo: { provider: string; url: string; authRequired: boolean; status: string };
    imd: { provider: string; portalUrl: string; configured: boolean; status: string };
  };
}

export type NavigationTab = 'dashboard' | 'live-map' | 'risk-assessment' | 'shelters-relief';

export interface RiskFactor {
  factor: string;
  measuredValue: string;
  threshold: string;
  score: number;
  maxScore: number;
  severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  rationale: string;
}

export interface RuleBasedRiskAssessment {
  stationId: string;
  locationName: string;
  district: string;
  assessedAt: string;
  methodology: string;
  overallScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  summaryExplanation: string;
  actionRecommendation: string;
  contributingFactors: RiskFactor[];
  dataQuality: {
    windAvailable: boolean;
    gustAvailable: boolean;
    pressureAvailable: boolean;
    rainAvailable: boolean;
    missingParamsCount: number;
  };
}

