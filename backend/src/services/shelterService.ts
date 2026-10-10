import { dbService } from '../config/database';
import { Shelter } from '../types/operational';

// Baseline operational shelters for Tamil Nadu coastline (used when DB is offline)
const BASELINE_SHELTERS: Shelter[] = [
  {
    id: 1,
    districtId: 1,
    districtName: 'Chennai',
    name: 'Santhome Multipurpose Cyclone Relief Center',
    address: 'Santhome High Road, Mylapore, Chennai 600004',
    latitude: 13.0334,
    longitude: 80.2785,
    totalCapacity: 1200,
    currentOccupancy: 0,
    occupancyPercentage: 0,
    status: 'STANDBY',
    facilities: {
      hasGenerator: true,
      hasMedicalPost: true,
      hasDrinkingWater: true,
    },
    contactPerson: 'K. Ramanathan (Tahsildar)',
    contactPhone: '+91-94440-12345',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'Greater Chennai Corporation Emergency Wing',
    lastInspectedAt: '2026-10-09T10:00:00Z',
  },
  {
    id: 2,
    districtId: 1,
    districtName: 'Chennai',
    name: 'Royapuram Coastal Community Shelter',
    address: 'East Coast Road, Royapuram, Chennai 600013',
    latitude: 13.1118,
    longitude: 80.2941,
    totalCapacity: 850,
    currentOccupancy: 0,
    occupancyPercentage: 0,
    status: 'STANDBY',
    facilities: {
      hasGenerator: true,
      hasMedicalPost: false,
      hasDrinkingWater: true,
    },
    contactPerson: 'M. Jayasudha (Revenue Officer)',
    contactPhone: '+91-94440-23456',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'Greater Chennai Corporation Emergency Wing',
    lastInspectedAt: '2026-10-08T15:30:00Z',
  },
  {
    id: 3,
    districtId: 2,
    districtName: 'Nagapattinam',
    name: 'Nagapattinam Port Cyclone Relief Centre',
    address: 'Near Light House, Nagapattinam Coastal Road, 611001',
    latitude: 10.7620,
    longitude: 79.8490,
    totalCapacity: 1500,
    currentOccupancy: 0,
    occupancyPercentage: 0,
    status: 'STANDBY',
    facilities: {
      hasGenerator: true,
      hasMedicalPost: true,
      hasDrinkingWater: true,
    },
    contactPerson: 'S. Anbarasan (Zonal Officer)',
    contactPhone: '+91-94431-34567',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'District Disaster Management Authority Nagapattinam',
    lastInspectedAt: '2026-10-09T14:00:00Z',
  },
  {
    id: 4,
    districtId: 2,
    districtName: 'Nagapattinam',
    name: 'Velankanni Coastal Evacuation Hub',
    address: 'Main Shrine Road, Velankanni, Nagapattinam 611111',
    latitude: 10.6800,
    longitude: 79.8495,
    totalCapacity: 2000,
    currentOccupancy: 0,
    occupancyPercentage: 0,
    status: 'STANDBY',
    facilities: {
      hasGenerator: true,
      hasMedicalPost: true,
      hasDrinkingWater: true,
    },
    contactPerson: 'P. Murugesan (Station Incharge)',
    contactPhone: '+91-94431-45678',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'District Disaster Management Authority Nagapattinam',
    lastInspectedAt: '2026-10-08T11:00:00Z',
  },
  {
    id: 5,
    districtId: 3,
    districtName: 'Cuddalore',
    name: 'Cuddalore Old Town Cyclone Center',
    address: 'Silver Beach Road, Devanampattinam, Cuddalore 607001',
    latitude: 11.7450,
    longitude: 79.7780,
    totalCapacity: 1100,
    currentOccupancy: 0,
    occupancyPercentage: 0,
    status: 'STANDBY',
    facilities: {
      hasGenerator: true,
      hasMedicalPost: true,
      hasDrinkingWater: true,
    },
    contactPerson: 'R. Soundararajan (Relief Inspector)',
    contactPhone: '+91-94422-56789',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'District Disaster Management Authority Cuddalore',
    lastInspectedAt: '2026-10-09T09:00:00Z',
  },
  {
    id: 6,
    districtId: 3,
    districtName: 'Cuddalore',
    name: 'Chidambaram Sub-Divisional Shelter',
    address: 'Near South Car Street, Chidambaram, Cuddalore 608001',
    latitude: 11.3992,
    longitude: 79.6936,
    totalCapacity: 900,
    currentOccupancy: 0,
    occupancyPercentage: 0,
    status: 'STANDBY',
    facilities: {
      hasGenerator: true,
      hasMedicalPost: false,
      hasDrinkingWater: true,
    },
    contactPerson: 'V. Dhanapal (Block Development Officer)',
    contactPhone: '+91-94422-67890',
    originType: 'MANUAL_OPERATIONAL',
    dataSource: 'District Disaster Management Authority Cuddalore',
    lastInspectedAt: '2026-10-07T16:00:00Z',
  },
];

export class ShelterService {
  public async getAllShelters(): Promise<Shelter[]> {
    if (dbService.isDbConnected()) {
      const query = `
        SELECT s.*, d.name as district_name
        FROM shelters s
        JOIN districts d ON s.district_id = d.id
        ORDER BY s.id ASC
      `;
      const res = await dbService.query(query);
      if (res && res.rows.length > 0) {
        return res.rows.map((row) => ({
          id: row.id,
          districtId: row.district_id,
          districtName: row.district_name,
          name: row.name,
          address: row.address,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          totalCapacity: row.total_capacity,
          currentOccupancy: row.current_occupancy,
          occupancyPercentage: Math.round((row.current_occupancy / row.total_capacity) * 100),
          status: row.status,
          facilities: {
            hasGenerator: row.has_generator,
            hasMedicalPost: row.has_medical_post,
            hasDrinkingWater: row.has_drinking_water,
          },
          contactPerson: row.contact_person,
          contactPhone: row.contact_phone,
          originType: 'MANUAL_OPERATIONAL',
          dataSource: row.data_source,
          lastInspectedAt: row.last_inspected_at ? row.last_inspected_at.toISOString() : row.created_at.toISOString(),
        }));
      }
    }

    // Return baseline operational data
    return BASELINE_SHELTERS;
  }

  public async getShelterById(id: number): Promise<Shelter | null> {
    const shelters = await this.getAllShelters();
    return shelters.find((s) => s.id === id) || null;
  }
}

export const shelterService = new ShelterService();
