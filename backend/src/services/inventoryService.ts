import { dbService } from '../config/database';
import { ReliefInventoryItem } from '../types/operational';

// Baseline operational relief inventory data (used when DB is offline)
const BASELINE_INVENTORY: ReliefInventoryItem[] = [
  {
    id: 1,
    shelterId: 1,
    shelterName: 'Santhome Multipurpose Cyclone Relief Center',
    districtName: 'Chennai',
    category: 'FOOD_RATIONS',
    itemName: 'Ready-to-Eat Emergency Food Packets (MRE)',
    quantity: 3500,
    unit: 'packets',
    criticalThreshold: 500,
    stockStatus: 'SUFFICIENT',
    notes: 'High-calorie biscuits, ready poha and dry nuts stock',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'TN Civil Supplies Corporation Hub',
    lastUpdatedAt: '2026-10-09T08:30:00Z',
  },
  {
    id: 2,
    shelterId: 1,
    shelterName: 'Santhome Multipurpose Cyclone Relief Center',
    districtName: 'Chennai',
    category: 'DRINKING_WATER',
    itemName: 'Purified Bottled Water (1L)',
    quantity: 5000,
    unit: 'liters',
    criticalThreshold: 1000,
    stockStatus: 'SUFFICIENT',
    notes: 'Supplied by Chennai Metro Water Supply & Sewerage Board',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'Chennai Metro Water Supply',
    lastUpdatedAt: '2026-10-09T08:30:00Z',
  },
  {
    id: 3,
    shelterId: 1,
    shelterName: 'Santhome Multipurpose Cyclone Relief Center',
    districtName: 'Chennai',
    category: 'MEDICAL_KITS',
    itemName: 'First Aid & Anti-Venom Trauma Kits',
    quantity: 120,
    unit: 'boxes',
    criticalThreshold: 30,
    stockStatus: 'SUFFICIENT',
    notes: 'Inspected by Public Health Directorate',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'District Medical Officer',
    lastUpdatedAt: '2026-10-08T14:00:00Z',
  },
  {
    id: 4,
    shelterId: 3,
    shelterName: 'Nagapattinam Port Cyclone Relief Centre',
    districtName: 'Nagapattinam',
    category: 'FOOD_RATIONS',
    itemName: 'Dry Grain & Rice Bags (25kg)',
    quantity: 180,
    unit: 'bags',
    criticalThreshold: 40,
    stockStatus: 'SUFFICIENT',
    notes: 'Sealed waterproof bags in dry storage',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'Nagapattinam DDMA Depot',
    lastUpdatedAt: '2026-10-09T07:15:00Z',
  },
  {
    id: 5,
    shelterId: 3,
    shelterName: 'Nagapattinam Port Cyclone Relief Centre',
    districtName: 'Nagapattinam',
    category: 'DRINKING_WATER',
    itemName: 'Packaged Drinking Water (20L Cans)',
    quantity: 300,
    unit: 'cans',
    criticalThreshold: 80,
    stockStatus: 'SUFFICIENT',
    notes: 'Regular chlorination verified',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'Nagapattinam Water Supply Division',
    lastUpdatedAt: '2026-10-09T07:15:00Z',
  },
  {
    id: 6,
    shelterId: 3,
    shelterName: 'Nagapattinam Port Cyclone Relief Centre',
    districtName: 'Nagapattinam',
    category: 'GENERATORS_FUEL',
    itemName: 'Diesel for Emergency Backup Generators',
    quantity: 750,
    unit: 'liters',
    criticalThreshold: 200,
    stockStatus: 'SUFFICIENT',
    notes: 'Tested on bi-weekly drill',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'TANGEDCO / DDMA',
    lastUpdatedAt: '2026-10-08T18:00:00Z',
  },
  {
    id: 7,
    shelterId: 5,
    shelterName: 'Cuddalore Old Town Cyclone Center',
    districtName: 'Cuddalore',
    category: 'TARPAULIN_SHEETS',
    itemName: 'Heavy-Duty Weatherproof Tarpaulin (20x20 ft)',
    quantity: 400,
    unit: 'units',
    criticalThreshold: 100,
    stockStatus: 'SUFFICIENT',
    notes: 'Stored for temporary roof and barrier protection',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'Cuddalore District Warehouse',
    lastUpdatedAt: '2026-10-09T11:45:00Z',
  },
  {
    id: 8,
    shelterId: 5,
    shelterName: 'Cuddalore Old Town Cyclone Center',
    districtName: 'Cuddalore',
    category: 'BEDDING_BLANKETS',
    itemName: 'Thermal Blankets and Sleeping Mats',
    quantity: 800,
    unit: 'units',
    criticalThreshold: 200,
    stockStatus: 'SUFFICIENT',
    notes: 'Standard disaster relief bedding kits',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'Tamil Nadu Disaster Response Force (TNDRF)',
    lastUpdatedAt: '2026-10-09T11:45:00Z',
  },
];

export class InventoryService {
  public async getAllInventory(): Promise<ReliefInventoryItem[]> {
    if (dbService.isDbConnected()) {
      const query = `
        SELECT r.*, s.name as shelter_name, d.name as district_name
        FROM relief_inventory r
        LEFT JOIN shelters s ON r.shelter_id = s.id
        LEFT JOIN districts d ON r.district_id = d.id
        ORDER BY r.id ASC
      `;
      const res = await dbService.query(query);
      if (res && res.rows.length > 0) {
        return res.rows.map((row) => ({
          id: row.id,
          shelterId: row.shelter_id,
          shelterName: row.shelter_name || 'Central District Depot',
          districtName: row.district_name || 'Tamil Nadu',
          category: row.category,
          itemName: row.item_name,
          quantity: parseFloat(row.quantity),
          unit: row.unit,
          criticalThreshold: parseFloat(row.critical_threshold),
          stockStatus: row.stock_status,
          notes: row.notes,
          originType: 'MANUAL_OPERATIONAL',
          dataSource: row.data_source,
          lastUpdatedAt: row.last_updated_at.toISOString(),
        }));
      }
    }

    return BASELINE_INVENTORY;
  }

  public async getInventoryByShelterId(shelterId: number): Promise<ReliefInventoryItem[]> {
    const all = await this.getAllInventory();
    return all.filter((item) => item.shelterId === shelterId);
  }
}

export const inventoryService = new InventoryService();
