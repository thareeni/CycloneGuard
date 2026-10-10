import { Request, Response } from 'express';
import { ReliefItem } from '../models/ReliefItemModel';
import { mongoDbService } from '../config/mongodb';

// Baseline data to populate MongoDB if empty
const BASELINE_MONGO_ITEMS = [
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
    dataSource: 'TN Civil Supplies Corporation Hub',
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
    dataSource: 'District Medical Officer',
  },
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
    quantity: 300,
    unit: 'cans',
    criticalThreshold: 80,
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
    dataSource: 'TANGEDCO / DDMA',
  },
  {
    itemName: 'Heavy-Duty Weatherproof Tarpaulin (20x20 ft)',
    shelterName: 'Cuddalore Old Town Cyclone Center',
    districtName: 'Cuddalore',
    category: 'TARPAULIN_SHEETS',
    quantity: 400,
    unit: 'units',
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
];

export class MongoInventoryController {
  /**
   * GET /api/mongo/inventory
   * Read all relief items from MongoDB collection
   */
  public async getAll(req: Request, res: Response) {
    if (!mongoDbService.isMongoConnected()) {
      return res.status(503).json({
        success: false,
        source: 'MongoDB (MERN)',
        status: 'UNAVAILABLE',
        message: 'MongoDB daemon is in standby. Configure MONGODB_URI in backend/.env to activate live MongoDB collections.',
        fallbackDataAvailable: true,
      });
    }

    try {
      // Auto-seed if collection is completely empty
      const count = await ReliefItem.countDocuments();
      if (count === 0) {
        await ReliefItem.insertMany(BASELINE_MONGO_ITEMS);
      }

      const { district, category } = req.query;
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
    if (!mongoDbService.isMongoConnected()) {
      return res.status(503).json({ success: false, message: 'MongoDB is in standby mode' });
    }

    try {
      const item = await ReliefItem.findById(req.params.id);
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
   * Create a new relief item in MongoDB
   */
  public async create(req: Request, res: Response) {
    if (!mongoDbService.isMongoConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Cannot create record: MongoDB connection is currently in standby mode.',
      });
    }

    try {
      const { itemName, shelterName, districtName, category, quantity, unit, criticalThreshold, notes } = req.body;

      if (!itemName || !shelterName || !districtName || !category || quantity === undefined || !unit) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: itemName, shelterName, districtName, category, quantity, unit',
        });
      }

      const newItem = new ReliefItem({
        itemName,
        shelterName,
        districtName,
        category,
        quantity: parseFloat(quantity),
        unit,
        criticalThreshold: criticalThreshold ? parseFloat(criticalThreshold) : 50,
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
    if (!mongoDbService.isMongoConnected()) {
      return res.status(503).json({ success: false, message: 'MongoDB is in standby mode' });
    }

    try {
      const { quantity, criticalThreshold, notes, stockStatus } = req.body;
      const updateData: any = {};

      if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
      if (criticalThreshold !== undefined) updateData.criticalThreshold = parseFloat(criticalThreshold);
      if (notes !== undefined) updateData.notes = notes;
      if (stockStatus !== undefined) updateData.stockStatus = stockStatus;

      const updated = await ReliefItem.findByIdAndUpdate(req.params.id, updateData, {
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
    if (!mongoDbService.isMongoConnected()) {
      return res.status(503).json({ success: false, message: 'MongoDB is in standby mode' });
    }

    try {
      const deleted = await ReliefItem.findByIdAndDelete(req.params.id);
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
