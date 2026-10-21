import { Request, Response } from 'express';
import { ReliefItem } from '../models/ReliefItemModel';
import { mongoDbService } from '../config/mongodb';

// Baseline comprehensive relief inventory covering all 14 coastal districts & 8 categories
const BASELINE_MONGO_ITEMS = [
  // 1. Chennai
  {
    itemName: 'Ready-to-Eat Emergency Food Packets (MRE)',
    shelterName: 'Santhome Multipurpose Cyclone Relief Center',
    districtName: 'Chennai',
    category: 'FOOD_RATIONS',
    quantity: 3500,
    unit: 'packets',
    criticalThreshold: 500,
    stockStatus: 'SUFFICIENT',
    notes: 'High-calorie biscuits, ready poha and dry nuts stock',
    dataSource: 'TN Civil Supplies Corporation Hub, Chennai',
  },
  {
    itemName: 'Purified Bottled Water (1L)',
    shelterName: 'Santhome Multipurpose Cyclone Relief Center',
    districtName: 'Chennai',
    category: 'DRINKING_WATER',
    quantity: 5000,
    unit: 'liters',
    criticalThreshold: 1000,
    stockStatus: 'SUFFICIENT',
    notes: 'Supplied by Chennai Metro Water Supply & Sewerage Board',
    dataSource: 'Chennai Metro Water Supply',
  },
  {
    itemName: 'First Aid & Anti-Venom Trauma Kits',
    shelterName: 'Santhome Multipurpose Cyclone Relief Center',
    districtName: 'Chennai',
    category: 'MEDICAL_KITS',
    quantity: 120,
    unit: 'boxes',
    criticalThreshold: 30,
    stockStatus: 'SUFFICIENT',
    notes: 'Inspected by Public Health Directorate',
    dataSource: 'District Medical Officer, Chennai',
  },
  {
    itemName: 'Heavy-Duty Weatherproof Tarpaulin (20x24ft)',
    shelterName: 'Royapuram Coastal Community Shelter',
    districtName: 'Chennai',
    category: 'TARPAULIN_SHEETS',
    quantity: 300,
    unit: 'sheets',
    criticalThreshold: 60,
    stockStatus: 'SUFFICIENT',
    notes: 'Reinforced eyelets for emergency roof cover',
    dataSource: 'Greater Chennai Corporation Warehouse',
  },

  // 2. Tiruvallur
  {
    itemName: 'Packaged Drinking Water (20L Cans)',
    shelterName: 'Pulicat Coastal Community Shelter',
    districtName: 'Tiruvallur',
    category: 'DRINKING_WATER',
    quantity: 400,
    unit: 'cans',
    criticalThreshold: 80,
    stockStatus: 'SUFFICIENT',
    notes: 'Sterile seal verified for emergency distribution',
    dataSource: 'Tiruvallur DDMA Water Depot',
  },
  {
    itemName: 'Emergency Ration Packs & Nut Mix',
    shelterName: 'Pulicat Coastal Community Shelter',
    districtName: 'Tiruvallur',
    category: 'FOOD_RATIONS',
    quantity: 1500,
    unit: 'packets',
    criticalThreshold: 300,
    stockStatus: 'SUFFICIENT',
    notes: 'Ready-to-eat dry rations for coastal hamlets',
    dataSource: 'Civil Supplies Warehouse, Ponneri',
  },
  {
    itemName: 'Inflatable Life Jackets & Rescue Rings',
    shelterName: 'Minjur Multipurpose Evacuation Center',
    districtName: 'Tiruvallur',
    category: 'RESCUE_GEAR',
    quantity: 150,
    unit: 'units',
    criticalThreshold: 30,
    stockStatus: 'SUFFICIENT',
    notes: 'Certified maritime safety gear for lagoon evacuation',
    dataSource: 'Tamil Nadu Fire & Rescue Services',
  },

  // 3. Chengalpattu
  {
    itemName: 'High-Power Diesel Generator Fuel (50L)',
    shelterName: 'Mahabalipuram Multipurpose Cyclone Shelter',
    districtName: 'Chengalpattu',
    category: 'GENERATORS_FUEL',
    quantity: 500,
    unit: 'liters',
    criticalThreshold: 100,
    stockStatus: 'SUFFICIENT',
    notes: 'Dedicated fuel buffer for shelter backup generator',
    dataSource: 'TANGEDCO / DDMA Chengalpattu',
  },
  {
    itemName: 'Emergency Thermal Blankets & Bedrolls',
    shelterName: 'Mahabalipuram Multipurpose Cyclone Shelter',
    districtName: 'Chengalpattu',
    category: 'BEDDING_BLANKETS',
    quantity: 600,
    unit: 'units',
    criticalThreshold: 120,
    stockStatus: 'SUFFICIENT',
    notes: 'Waterproof outer layer bedding sets',
    dataSource: 'TNDRF Regional Depot',
  },
  {
    itemName: 'VHF Coastal Emergency Walkie-Talkies',
    shelterName: 'Covelong Fishermen Safety Center',
    districtName: 'Chengalpattu',
    category: 'COMMUNICATION_GEAR',
    quantity: 25,
    unit: 'sets',
    criticalThreshold: 5,
    stockStatus: 'SUFFICIENT',
    notes: 'Direct channel link with Mamallapuram Coast Guard Station',
    dataSource: 'Police Wireless Division Chengalpattu',
  },

  // 4. Villupuram
  {
    itemName: 'Packaged Drinking Water (20L Cans)',
    shelterName: 'Marakkanam Coastal Relief Shelter',
    districtName: 'Villupuram',
    category: 'DRINKING_WATER',
    quantity: 350,
    unit: 'cans',
    criticalThreshold: 70,
    stockStatus: 'SUFFICIENT',
    notes: 'Potable water stock for salt-pan evacuee families',
    dataSource: 'Villupuram DDMA Logistics Hub',
  },
  {
    itemName: 'High-Calorie Meal Ration Packs',
    shelterName: 'Marakkanam Coastal Relief Shelter',
    districtName: 'Villupuram',
    category: 'FOOD_RATIONS',
    quantity: 1200,
    unit: 'packets',
    criticalThreshold: 250,
    stockStatus: 'SUFFICIENT',
    notes: 'High-shelf-life nutrition biscuits and meal packs',
    dataSource: 'TN Civil Supplies Corporation Tindivanam',
  },
  {
    itemName: 'Heavy Tarpaulin Weatherproof Rolls',
    shelterName: 'Koonimedu Multipurpose Evacuation Center',
    districtName: 'Villupuram',
    category: 'TARPAULIN_SHEETS',
    quantity: 250,
    unit: 'sheets',
    criticalThreshold: 50,
    stockStatus: 'SUFFICIENT',
    notes: 'Temporary shelter roofing material',
    dataSource: 'Villupuram Revenue Division',
  },

  // 5. Cuddalore
  {
    itemName: 'Heavy-Duty Weatherproof Tarpaulin (20x20 ft)',
    shelterName: 'Cuddalore Old Town Cyclone Center',
    districtName: 'Cuddalore',
    category: 'TARPAULIN_SHEETS',
    quantity: 400,
    unit: 'sheets',
    criticalThreshold: 100,
    stockStatus: 'SUFFICIENT',
    notes: 'Stored for temporary roof and barrier protection',
    dataSource: 'Cuddalore District Warehouse',
  },
  {
    itemName: 'Thermal Blankets and Sleeping Mats',
    shelterName: 'Cuddalore Old Town Cyclone Center',
    districtName: 'Cuddalore',
    category: 'BEDDING_BLANKETS',
    quantity: 800,
    unit: 'units',
    criticalThreshold: 200,
    stockStatus: 'SUFFICIENT',
    notes: 'Standard disaster relief bedding kits',
    dataSource: 'Tamil Nadu Disaster Response Force (TNDRF)',
  },
  {
    itemName: 'Portable Emergency Diesel Generators (15 kVA)',
    shelterName: 'Sothikuppam MPES Pachayankuppam',
    districtName: 'Cuddalore',
    category: 'GENERATORS_FUEL',
    quantity: 6,
    unit: 'units',
    criticalThreshold: 2,
    stockStatus: 'SUFFICIENT',
    notes: 'Mobile gensets for storm surge blackouts',
    dataSource: 'Cuddalore District Administration',
  },
  {
    itemName: 'Emergency Medical Trauma Kits & Anti-Venom',
    shelterName: 'Sothikuppam MPES Pachayankuppam',
    districtName: 'Cuddalore',
    category: 'MEDICAL_KITS',
    quantity: 80,
    unit: 'boxes',
    criticalThreshold: 20,
    stockStatus: 'SUFFICIENT',
    notes: 'Specialized flood and snakebite medical kits',
    dataSource: 'Joint Director of Health Cuddalore',
  },

  // 6. Mayiladuthurai
  {
    itemName: 'Ready-to-Eat Food Rations',
    shelterName: 'Poompuhar Coastal Disaster Relief Center',
    districtName: 'Mayiladuthurai',
    category: 'FOOD_RATIONS',
    quantity: 1600,
    unit: 'packets',
    criticalThreshold: 350,
    stockStatus: 'SUFFICIENT',
    notes: 'Dry food packets for coastal fisherfolk',
    dataSource: 'Mayiladuthurai DDMA Central Store',
  },
  {
    itemName: 'Purified Bottled Water (1L)',
    shelterName: 'Poompuhar Coastal Disaster Relief Center',
    districtName: 'Mayiladuthurai',
    category: 'DRINKING_WATER',
    quantity: 2500,
    unit: 'liters',
    criticalThreshold: 500,
    stockStatus: 'SUFFICIENT',
    notes: 'Bottled water pallets in dry storage',
    dataSource: 'Tamil Nadu Water Supply Board',
  },
  {
    itemName: 'Nylon Coastal Rescue Ropes & Life Rings',
    shelterName: 'Thirumailadi Multipurpose Evacuation Shelter',
    districtName: 'Mayiladuthurai',
    category: 'RESCUE_GEAR',
    quantity: 75,
    unit: 'sets',
    criticalThreshold: 15,
    stockStatus: 'SUFFICIENT',
    notes: 'Marine rescue gear for estuary flooding',
    dataSource: 'Coastal Security Group Mayiladuthurai',
  },

  // 7. Nagapattinam
  {
    itemName: 'Dry Grain & Rice Bags (25kg)',
    shelterName: 'Nagapattinam Port Cyclone Relief Centre',
    districtName: 'Nagapattinam',
    category: 'FOOD_RATIONS',
    quantity: 180,
    unit: 'bags',
    criticalThreshold: 40,
    stockStatus: 'SUFFICIENT',
    notes: 'Sealed waterproof bags in dry storage',
    dataSource: 'Nagapattinam DDMA Depot',
  },
  {
    itemName: 'Packaged Drinking Water (20L Cans)',
    shelterName: 'Nagapattinam Port Cyclone Relief Centre',
    districtName: 'Nagapattinam',
    category: 'DRINKING_WATER',
    quantity: 500,
    unit: 'cans',
    criticalThreshold: 100,
    stockStatus: 'SUFFICIENT',
    notes: 'Regular chlorination verified',
    dataSource: 'Nagapattinam Water Supply Division',
  },
  {
    itemName: 'Diesel for Emergency Backup Generators',
    shelterName: 'Nagapattinam Port Cyclone Relief Centre',
    districtName: 'Nagapattinam',
    category: 'GENERATORS_FUEL',
    quantity: 750,
    unit: 'liters',
    criticalThreshold: 200,
    stockStatus: 'SUFFICIENT',
    notes: 'Tested on bi-weekly drill',
    dataSource: 'TANGEDCO / DDMA Nagapattinam',
  },
  {
    itemName: 'Inflatable Motorized Rescue Dinghy Boats',
    shelterName: 'Velankanni Coastal Evacuation Hub',
    districtName: 'Nagapattinam',
    category: 'RESCUE_GEAR',
    quantity: 4,
    unit: 'units',
    criticalThreshold: 1,
    stockStatus: 'SUFFICIENT',
    notes: 'Heavy-duty 40HP OBM inflatable boats for water rescues',
    dataSource: 'NDRF 4th Battalion Arakkonam Unit',
  },
  {
    itemName: 'Satellite Emergency Handsets (Inmarsat)',
    shelterName: 'Velankanni Coastal Evacuation Hub',
    districtName: 'Nagapattinam',
    category: 'COMMUNICATION_GEAR',
    quantity: 8,
    unit: 'units',
    criticalThreshold: 2,
    stockStatus: 'SUFFICIENT',
    notes: 'Emergency satellite comms for network outage',
    dataSource: 'TNSDMA Emergency Telecom Wing',
  },

  // 8. Tiruvarur
  {
    itemName: 'Packaged Drinking Water (20L Cans)',
    shelterName: 'Muthupet Estuary Cyclone Relief Hub',
    districtName: 'Tiruvarur',
    category: 'DRINKING_WATER',
    quantity: 300,
    unit: 'cans',
    criticalThreshold: 60,
    stockStatus: 'SUFFICIENT',
    notes: 'Drinking water reserve for mangrove delta villages',
    dataSource: 'Tiruvarur District Administration',
  },
  {
    itemName: 'Thermal Bedding Mats & Woolen Blankets',
    shelterName: 'Muthupet Estuary Cyclone Relief Hub',
    districtName: 'Tiruvarur',
    category: 'BEDDING_BLANKETS',
    quantity: 500,
    unit: 'units',
    criticalThreshold: 100,
    stockStatus: 'SUFFICIENT',
    notes: 'Standard disaster relief bedding kits',
    dataSource: 'TNDRF Tiruvarur Depot',
  },
  {
    itemName: 'First Aid Antiseptic & Bandage Trauma Kits',
    shelterName: 'Thiruthuraipoondi Coastal Evacuation Facility',
    districtName: 'Tiruvarur',
    category: 'MEDICAL_KITS',
    quantity: 60,
    unit: 'boxes',
    criticalThreshold: 15,
    stockStatus: 'SUFFICIENT',
    notes: 'Equipped with oral rehydration salts and trauma dressings',
    dataSource: 'Deputy Director of Health Tiruvarur',
  },

  // 9. Thanjavur
  {
    itemName: 'High-Calorie Meal Ration Packs',
    shelterName: 'Mallipattinam Coastal Evacuation Center',
    districtName: 'Thanjavur',
    category: 'FOOD_RATIONS',
    quantity: 1400,
    unit: 'packets',
    criticalThreshold: 300,
    stockStatus: 'SUFFICIENT',
    notes: 'Emergency meal packets for coastal fishing community',
    dataSource: 'Thanjavur DDMA Relief Supply',
  },
  {
    itemName: 'Drinking Water (20L Cans)',
    shelterName: 'Mallipattinam Coastal Evacuation Center',
    districtName: 'Thanjavur',
    category: 'DRINKING_WATER',
    quantity: 350,
    unit: 'cans',
    criticalThreshold: 70,
    stockStatus: 'SUFFICIENT',
    notes: 'Sealed potable water cans in dry storage',
    dataSource: 'Pattukkottai Water Division',
  },
  {
    itemName: 'Emergency Diesel Fuel for Generators',
    shelterName: 'Sethubavachatram Cyclone Relief Shelter',
    districtName: 'Thanjavur',
    category: 'GENERATORS_FUEL',
    quantity: 400,
    unit: 'liters',
    criticalThreshold: 80,
    stockStatus: 'SUFFICIENT',
    notes: 'Generator fuel reserve for power cut contingencies',
    dataSource: 'TANGEDCO Thanjavur',
  },

  // 10. Pudukkottai
  {
    itemName: 'Tarpaulin Ground Mats & Shelter Sheets',
    shelterName: 'Kottaipattinam Fishery Welfare Shelter',
    districtName: 'Pudukkottai',
    category: 'TARPAULIN_SHEETS',
    quantity: 300,
    unit: 'sheets',
    criticalThreshold: 60,
    stockStatus: 'SUFFICIENT',
    notes: 'HDPE woven waterproof tarpaulin sheets',
    dataSource: 'Pudukkottai District Revenue Wing',
  },
  {
    itemName: 'Emergency Medical Trauma Kits',
    shelterName: 'Kottaipattinam Fishery Welfare Shelter',
    districtName: 'Pudukkottai',
    category: 'MEDICAL_KITS',
    quantity: 50,
    unit: 'boxes',
    criticalThreshold: 10,
    stockStatus: 'SUFFICIENT',
    notes: 'First aid and emergency antiseptics',
    dataSource: 'Primary Health Centre Kottaipattinam',
  },
  {
    itemName: 'Purified Water Bottles (1L)',
    shelterName: 'Manamelkudi Coastal Relief Centre',
    districtName: 'Pudukkottai',
    category: 'DRINKING_WATER',
    quantity: 2000,
    unit: 'liters',
    criticalThreshold: 400,
    stockStatus: 'SUFFICIENT',
    notes: 'Packaged drinking water crates',
    dataSource: 'Pudukkottai DDMA Supply',
  },

  // 11. Ramanathapuram
  {
    itemName: 'Desalinated Bottled Drinking Water',
    shelterName: 'Rameswaram Island Multipurpose Cyclone Shelter',
    districtName: 'Ramanathapuram',
    category: 'DRINKING_WATER',
    quantity: 4000,
    unit: 'liters',
    criticalThreshold: 800,
    stockStatus: 'SUFFICIENT',
    notes: 'Desalination plant buffer reserve for island community',
    dataSource: 'Ramanathapuram CWSS Desalination Wing',
  },
  {
    itemName: 'Dry Grain & High-Energy Food Rations',
    shelterName: 'Rameswaram Island Multipurpose Cyclone Shelter',
    districtName: 'Ramanathapuram',
    category: 'FOOD_RATIONS',
    quantity: 2200,
    unit: 'packets',
    criticalThreshold: 450,
    stockStatus: 'SUFFICIENT',
    notes: 'Sealed waterproof ready-to-eat ration packets',
    dataSource: 'Tamil Nadu Civil Supplies Corp Rameswaram',
  },
  {
    itemName: 'Inflatable Life Jackets & Rescue Buoys',
    shelterName: 'Mandapam Coastal Evacuation Center',
    districtName: 'Ramanathapuram',
    category: 'RESCUE_GEAR',
    quantity: 200,
    unit: 'units',
    criticalThreshold: 40,
    stockStatus: 'SUFFICIENT',
    notes: 'SOLAS-approved life vests for Pamban channel evacuees',
    dataSource: 'Indian Coast Guard Station Mandapam',
  },
  {
    itemName: 'Mobile Satellite Radio Communications Set',
    shelterName: 'Mandapam Coastal Evacuation Center',
    districtName: 'Ramanathapuram',
    category: 'COMMUNICATION_GEAR',
    quantity: 12,
    unit: 'sets',
    criticalThreshold: 3,
    stockStatus: 'SUFFICIENT',
    notes: 'Two-way satellite transceivers for severe blackout',
    dataSource: 'State Emergency Operations Centre (SEOC)',
  },

  // 12. Thoothukudi
  {
    itemName: 'Emergency Drinking Water Cans (20L)',
    shelterName: 'V.O.C. Port Coastal Evacuation Center',
    districtName: 'Thoothukudi',
    category: 'DRINKING_WATER',
    quantity: 600,
    unit: 'cans',
    criticalThreshold: 120,
    stockStatus: 'SUFFICIENT',
    notes: 'Potable water for port and coastal evacuees',
    dataSource: 'Thoothukudi Port Trust Fire & Safety',
  },
  {
    itemName: 'Heavy Generator Fuel (Diesel)',
    shelterName: 'V.O.C. Port Coastal Evacuation Center',
    districtName: 'Thoothukudi',
    category: 'GENERATORS_FUEL',
    quantity: 1000,
    unit: 'liters',
    criticalThreshold: 200,
    stockStatus: 'SUFFICIENT',
    notes: 'Fuel barrels for continuous 72-hour shelter power',
    dataSource: 'VOC Port Engineering Department',
  },
  {
    itemName: 'Emergency Blankets and Bedrolls',
    shelterName: 'Tiruchendur Coastal Community Shelter',
    districtName: 'Thoothukudi',
    category: 'BEDDING_BLANKETS',
    quantity: 700,
    unit: 'units',
    criticalThreshold: 140,
    stockStatus: 'SUFFICIENT',
    notes: 'Clean sanitized bedding and wool blankets',
    dataSource: 'Thoothukudi District DDMA Store',
  },
  {
    itemName: 'Industrial Marine Rescue Ropes & Harnesses',
    shelterName: 'Tiruchendur Coastal Community Shelter',
    districtName: 'Thoothukudi',
    category: 'RESCUE_GEAR',
    quantity: 90,
    unit: 'sets',
    criticalThreshold: 20,
    stockStatus: 'SUFFICIENT',
    notes: 'Braided floating rescue lines for rough seas',
    dataSource: 'Fisheries Department Thoothukudi',
  },

  // 13. Tirunelveli
  {
    itemName: 'Purified Drinking Water (1L Bottles)',
    shelterName: 'Radhapuram Taluk Coastal Cyclone Shelter',
    districtName: 'Tirunelveli',
    category: 'DRINKING_WATER',
    quantity: 1800,
    unit: 'liters',
    criticalThreshold: 350,
    stockStatus: 'SUFFICIENT',
    notes: 'Palletized drinking water crates',
    dataSource: 'Tirunelveli DDMA Logistics',
  },
  {
    itemName: 'Ready Food Meals & Energy Bars',
    shelterName: 'Radhapuram Taluk Coastal Cyclone Shelter',
    districtName: 'Tirunelveli',
    category: 'FOOD_RATIONS',
    quantity: 1100,
    unit: 'packets',
    criticalThreshold: 200,
    stockStatus: 'SUFFICIENT',
    notes: 'Nutritious emergency food rations',
    dataSource: 'Civil Supplies Corporation Tirunelveli',
  },
  {
    itemName: 'Disaster First Aid Medical Kits',
    shelterName: 'Uvari Coastal Fishermen Shelter',
    districtName: 'Tirunelveli',
    category: 'MEDICAL_KITS',
    quantity: 45,
    unit: 'boxes',
    criticalThreshold: 10,
    stockStatus: 'SUFFICIENT',
    notes: 'Emergency trauma dressings and antibiotics',
    dataSource: 'Public Health Department Tirunelveli',
  },

  // 14. Kanniyakumari
  {
    itemName: 'Marine Rescue Dinghies & Safety Rings',
    shelterName: 'Kanyakumari Cape Maritime Relief Center',
    districtName: 'Kanniyakumari',
    category: 'RESCUE_GEAR',
    quantity: 15,
    unit: 'units',
    criticalThreshold: 3,
    stockStatus: 'SUFFICIENT',
    notes: 'Cape Comorin marine search and rescue gear',
    dataSource: 'Coastal Security Police Kanniyakumari',
  },
  {
    itemName: 'Emergency Communications Walkie-Talkies',
    shelterName: 'Kanyakumari Cape Maritime Relief Center',
    districtName: 'Kanniyakumari',
    category: 'COMMUNICATION_GEAR',
    quantity: 30,
    unit: 'sets',
    criticalThreshold: 6,
    stockStatus: 'SUFFICIENT',
    notes: 'High-frequency emergency transceivers',
    dataSource: 'Kanniyakumari District Police Wireless',
  },
  {
    itemName: 'Packaged Drinking Water (20L Cans)',
    shelterName: 'Colachel Port Cyclone Shelter',
    districtName: 'Kanniyakumari',
    category: 'DRINKING_WATER',
    quantity: 550,
    unit: 'cans',
    criticalThreshold: 110,
    stockStatus: 'SUFFICIENT',
    notes: 'Drinking water reserve for port evacuees',
    dataSource: 'TWAD Board Kanniyakumari',
  },
  {
    itemName: 'High-Capacity Diesel Power Generators',
    shelterName: 'Colachel Port Cyclone Shelter',
    districtName: 'Kanniyakumari',
    category: 'GENERATORS_FUEL',
    quantity: 8,
    unit: 'units',
    criticalThreshold: 2,
    stockStatus: 'SUFFICIENT',
    notes: 'Auxiliary backup generators for harbor evacuation center',
    dataSource: 'Colachel Port Authority',
  },
];

// In-memory fallback repository when MongoDB Atlas is disconnected/standby
let inMemoryItems: any[] = BASELINE_MONGO_ITEMS.map((item, idx) => ({
  _id: `mem_item_${idx + 1}`,
  ...item,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export function getInMemoryInventory(): any[] {
  return inMemoryItems;
}

export function updateInMemoryStock(shelterName: string, itemName: string, quantity: number, districtName: string, category: string, unit: string) {
  const existing = inMemoryItems.find(
    (i) => i.shelterName.toLowerCase() === shelterName.toLowerCase() && i.itemName.toLowerCase() === itemName.toLowerCase()
  );
  if (existing) {
    existing.quantity += quantity;
    existing.updatedAt = new Date();
  } else {
    inMemoryItems.push({
      _id: `mem_item_${Date.now()}`,
      itemName,
      shelterName,
      districtName,
      category,
      quantity,
      unit,
      criticalThreshold: Math.max(50, Math.round(quantity * 0.2)),
      stockStatus: 'SUFFICIENT',
      notes: 'Delivered via automated logistics transfer pipeline',
      dataSource: 'Transfer Delivery Confirmation',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export class MongoInventoryController {
  /**
   * GET /api/mongo/inventory
   * Read all relief items from MongoDB collection (with in-memory fallback)
   */
  public async getAll(req: Request, res: Response) {
    const { district, category } = req.query;

    if (!mongoDbService.isMongoConnected()) {
      let filtered = [...inMemoryItems];
      if (district && district !== 'ALL') {
        filtered = filtered.filter((i) => i.districtName.toLowerCase() === String(district).toLowerCase());
      }
      if (category && category !== 'ALL') {
        filtered = filtered.filter((i) => i.category === category);
      }

      return res.json({
        success: true,
        source: 'IN_MEMORY_FALLBACK (MongoDB Standby)',
        originType: 'MANUAL_OPERATIONAL',
        note: 'Serving from resilient in-memory fallback cache while MongoDB Atlas is in standby.',
        count: filtered.length,
        data: filtered,
      });
    }

    try {
      // Auto-seed if collection is completely empty
      const count = await ReliefItem.countDocuments();
      if (count === 0) {
        await ReliefItem.insertMany(BASELINE_MONGO_ITEMS);
      }

      const filter: any = {};
      if (district && district !== 'ALL') filter.districtName = district;
      if (category && category !== 'ALL') filter.category = category;

      const items = await ReliefItem.find(filter).sort({ createdAt: -1 });

      res.json({
        success: true,
        source: 'MongoDB Collection (MERN Stack)',
        originType: 'MANUAL_OPERATIONAL',
        count: items.length,
        data: items,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to query MongoDB collection',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/mongo/inventory/:id
   */
  public async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!mongoDbService.isMongoConnected()) {
      const item = inMemoryItems.find((i) => i._id === id || i._id === `mem_item_${id}`);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found in fallback storage' });
      }
      return res.json({ success: true, source: 'IN_MEMORY_FALLBACK', data: item });
    }

    try {
      const item = await ReliefItem.findById(id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found in MongoDB' });
      }
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/mongo/inventory
   * Create a new relief item in MongoDB (or in-memory fallback)
   */
  public async create(req: Request, res: Response) {
    const { itemName, shelterName, districtName, category, quantity, unit, criticalThreshold, notes } = req.body;

    if (!itemName || !shelterName || !districtName || !category || quantity === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: itemName, shelterName, districtName, category, quantity, unit',
      });
    }

    const parsedQty = parseFloat(quantity);
    const parsedThreshold = criticalThreshold ? parseFloat(criticalThreshold) : 50;

    if (!mongoDbService.isMongoConnected()) {
      const newItem = {
        _id: `mem_item_${Date.now()}`,
        itemName: itemName.trim(),
        shelterName: shelterName.trim(),
        districtName: districtName.trim(),
        category,
        quantity: parsedQty,
        unit: unit.trim(),
        criticalThreshold: parsedThreshold,
        stockStatus: parsedQty <= parsedThreshold ? 'CRITICAL' : 'SUFFICIENT',
        notes: notes?.trim() || 'Manual stock entry (in-memory mode)',
        dataSource: 'CycloneGuard MERN Inventory Portal (In-Memory)',
        originType: 'MANUAL_OPERATIONAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryItems.unshift(newItem);

      return res.status(201).json({
        success: true,
        source: 'IN_MEMORY_FALLBACK (MongoDB Standby)',
        message: 'Relief item created in fallback storage.',
        data: newItem,
      });
    }

    try {
      const newItem = new ReliefItem({
        itemName,
        shelterName,
        districtName,
        category,
        quantity: parsedQty,
        unit,
        criticalThreshold: parsedThreshold,
        notes,
        dataSource: 'CycloneGuard MERN Inventory Portal',
        originType: 'MANUAL_OPERATIONAL',
      });

      const saved = await newItem.save();

      res.status(201).json({
        success: true,
        message: 'Relief item created successfully in MongoDB',
        data: saved,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Failed to create relief item in MongoDB',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/mongo/inventory/:id
   * Update relief item quantity or details
   */
  public async update(req: Request, res: Response) {
    const { id } = req.params;
    const { quantity, criticalThreshold, notes, stockStatus } = req.body;

    if (!mongoDbService.isMongoConnected()) {
      const item = inMemoryItems.find((i) => i._id === id || i._id === `mem_item_${id}`);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found in fallback storage' });
      }

      if (quantity !== undefined) item.quantity = parseFloat(quantity);
      if (criticalThreshold !== undefined) item.criticalThreshold = parseFloat(criticalThreshold);
      if (notes !== undefined) item.notes = notes;
      if (stockStatus !== undefined) item.stockStatus = stockStatus;
      item.updatedAt = new Date();

      return res.json({
        success: true,
        source: 'IN_MEMORY_FALLBACK (MongoDB Standby)',
        message: 'Relief item updated in fallback storage',
        data: item,
      });
    }

    try {
      const updateData: any = {};

      if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
      if (criticalThreshold !== undefined) updateData.criticalThreshold = parseFloat(criticalThreshold);
      if (notes !== undefined) updateData.notes = notes;
      if (stockStatus !== undefined) updateData.stockStatus = stockStatus;

      const updated = await ReliefItem.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Item not found in MongoDB' });
      }

      res.json({
        success: true,
        message: 'Relief item updated successfully in MongoDB',
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/mongo/inventory/:id
   * Remove relief item
   */
  public async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!mongoDbService.isMongoConnected()) {
      const idx = inMemoryItems.findIndex((i) => i._id === id || i._id === `mem_item_${id}`);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Item not found in fallback storage' });
      }
      const deleted = inMemoryItems.splice(idx, 1)[0];
      return res.json({
        success: true,
        source: 'IN_MEMORY_FALLBACK (MongoDB Standby)',
        message: 'Relief item deleted from fallback storage',
        data: deleted,
      });
    }

    try {
      const deleted = await ReliefItem.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Item not found in MongoDB' });
      }

      res.json({
        success: true,
        message: 'Relief item deleted from MongoDB',
        data: deleted,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const mongoInventoryController = new MongoInventoryController();
