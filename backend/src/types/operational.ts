export type ShelterStatus = 'STANDBY' | 'OPEN' | 'FULL' | 'CLOSED';

export interface ShelterFacilities {
  hasGenerator: boolean;
  hasMedicalPost: boolean;
  hasDrinkingWater: boolean;
}

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
  facilities: ShelterFacilities;
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
  routeGeometry?: [number, number][]; // [lat, lng] array for Leaflet polyline
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
