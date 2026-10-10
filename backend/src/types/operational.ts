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
