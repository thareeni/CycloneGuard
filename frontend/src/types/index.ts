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
  cycloneScore?: number;
  cycloneCategory?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  rainfallScore?: number;
  rainfallCategory?: 'LOW' | 'MODERATE' | 'HEAVY' | 'TORRENTIAL';
  riskScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  dataFreshness: 'LIVE' | 'CACHED' | 'STALE';
  rainfallDescription?: string;
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

export interface CoastalDistrict {
  id: number;
  name: string;
  state: 'Tamil Nadu';
  stationId: string;
  latitude: number;
  longitude: number;
  headquarters: string;
  emergencyControlRoomPhone: string;
  coastalZone: string;
  isHighRiskZone: boolean;
  totalRegisteredShelters: number;
  baselineShelterCapacity: number;
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
  availableCapacity: number;
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
  verificationStatus: 'VERIFIED_BASELINE' | 'LIVE_DISTRICT_FEED' | 'DEMO_RECORD' | 'DISTRICT_DISASTER_PLAN';
  dataSource: string;
  lastInspectedAt: string;
}

export interface NearestShelterRecommendation {
  shelter: Shelter;
  straightLineDistanceKm: number;
  roadDistanceKm?: number;
  estimatedDurationMinutes?: number;
  routeGeometry?: [number, number][];
  routingStatus: 'OSRM_ROAD_NETWORK' | 'FALLBACK_GEODESIC' | 'ROUTING_UNAVAILABLE';
  routingNotes?: string;
  safetyDisclaimer: string;
}

export type InventoryCategory =
  | 'FOOD_RATIONS'
  | 'DRINKING_WATER'
  | 'MEDICAL_KITS'
  | 'BEDDING_BLANKETS'
  | 'GENERATORS_FUEL'
  | 'TARPAULIN_SHEETS'
  | 'RESCUE_GEAR'
  | 'COMMUNICATION_GEAR';

export type StockStatus = 'SUFFICIENT' | 'LOW' | 'CRITICAL' | 'DEPLETED';

export interface ReliefInventoryItem {
  _id?: string;
  id?: number;
  shelterId?: number;
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
  lastUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TransferStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'PARTIALLY_DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TransferPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface ITransferTimeline {
  status: TransferStatus;
  timestamp: string;
  updatedBy: string;
  notes?: string;
}

export interface ReliefTransfer {
  _id?: string;
  transferId: string;
  sourceWarehouse: string;
  destinationShelterId: number;
  destinationShelterName: string;
  destinationDistrict: string;
  itemName: string;
  category: InventoryCategory;
  quantity: number;
  deliveredQuantity?: number;
  unit: string;
  status: TransferStatus;
  priority: TransferPriority;
  requestedBy: string;
  approvedBy?: string;
  carrierVehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  dispatchedAt?: string;
  receivedBy?: string;
  completedAt?: string;
  remarks?: string;
  timeline: ITransferTimeline[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ConsumptionEstimate {
  shelterId: number;
  shelterName: string;
  district: string;
  totalCapacity: number;
  currentOccupancy: number;
  effectiveOccupancy: number;
  stocks: {
    drinkingWaterLiters: number;
    waterDailyConsumptionEst: number;
    waterAutonomyDays: number;
    waterShortageRisk: 'LOW' | 'MODERATE' | 'HIGH';
    foodPackets: number;
    foodDailyConsumptionEst: number;
    foodAutonomyDays: number;
    foodShortageRisk: 'LOW' | 'MODERATE' | 'HIGH';
  };
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
    gdacsFallback?: { provider: string; status: string };
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

  // Separate Score 1: Cyclone Impact Score (0 - 100)
  cycloneScore: number;
  cycloneCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  cycloneSummary: string;
  cycloneFactors: RiskFactor[];

  // Separate Score 2: Rainfall Impact Score (0 - 100)
  rainfallScore: number;
  rainfallCategory: 'LOW' | 'MODERATE' | 'HEAVY' | 'TORRENTIAL';
  rainfallSummary: string;
  rainfallFactors: RiskFactor[];

  // Composite / General Impact Score
  overallScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  summaryExplanation: string;
  actionRecommendation: string;
  contributingFactors: RiskFactor[];
  geographicExposure?: {
    coastalZone: string;
    coastalProximityKm: number;
    isHighRiskCoastalZone: boolean;
    unlinkedDatasetsNotice: string;
  };
  dataQuality: {
    windAvailable: boolean;
    gustAvailable: boolean;
    pressureAvailable: boolean;
    rainAvailable: boolean;
    missingParamsCount: number;
  };
}

export interface DistrictRiskSummary {
  districtId: number;
  districtName: string;
  stationId: string;
  locationName: string;

  // Separate Score 1: Cyclone Impact Score
  cycloneScore: number;
  cycloneCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

  // Separate Score 2: Rainfall Impact Score
  rainfallScore: number;
  rainfallCategory: 'LOW' | 'MODERATE' | 'HEAVY' | 'TORRENTIAL';

  // Composite
  overallScore: number;
  riskScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

  windSpeedKmh: number;
  windGustsKmh: number;
  surfacePressureHpa: number;
  rainfallMm: number;
  precipitationMm?: number;
  rainfallDescription?: string;
  actionRecommendation: string;
  coastalZone: string;
  isHighRiskZone: boolean;
}

export type UserRole = 'ADMIN' | 'DISTRICT_OFFICIAL' | 'PUBLIC';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedDistrict?: string;
  assignedDistrictId?: number;
  phone?: string;
}

export interface DemoAccount {
  role: UserRole;
  name: string;
  email: string;
  samplePassword?: string;
  jurisdiction: string;
  permissions: string;
}

export interface AuditLogEntry {
  _id?: string;
  id?: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetDistrict?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: string;
  ipAddress?: string;
  timestamp: string;
  createdAt?: string;
}
