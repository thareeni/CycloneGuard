import { Request, Response } from 'express';
import { ReliefTransfer, TransferStatus } from '../models/ReliefTransferModel';
import { ReliefItem } from '../models/ReliefItemModel';
import { mongoDbService } from '../config/mongodb';
import { shelterService } from '../services/shelterService';
import { getInMemoryInventory, updateInMemoryStock } from './mongoInventoryController';

// Initial baseline transfers to populate if empty
const BASELINE_TRANSFERS = [
  {
    transferId: 'TRF-TN-802101',
    sourceWarehouse: 'State Disaster Logistics Hub, Chennai Port',
    destinationShelterId: 1,
    destinationShelterName: 'Santhome Multipurpose Cyclone Relief Center',
    destinationDistrict: 'Chennai',
    itemName: 'Purified Bottled Water (1L)',
    category: 'DRINKING_WATER',
    quantity: 1500,
    deliveredQuantity: 1500,
    unit: 'liters',
    status: 'COMPLETED',
    priority: 'EMERGENCY',
    requestedBy: 'K. Ramanathan (Tahsildar)',
    approvedBy: 'State Disaster Management Commissioner',
    carrierVehicleNo: 'TN-01-G-4521',
    driverName: 'R. Murugan',
    driverPhone: '+91-98840-54321',
    dispatchedAt: new Date(Date.now() - 36 * 3600 * 1000),
    receivedBy: 'Santhome Shelter Incharge',
    completedAt: new Date(Date.now() - 30 * 3600 * 1000),
    remarks: 'Pre-landfall emergency buffer stock dispatched and received safely.',
    timeline: [
      {
        status: 'REQUESTED',
        timestamp: new Date(Date.now() - 48 * 3600 * 1000),
        updatedBy: 'K. Ramanathan (Tahsildar)',
        notes: 'Requested emergency water replenishment.',
      },
      {
        status: 'APPROVED',
        timestamp: new Date(Date.now() - 44 * 3600 * 1000),
        updatedBy: 'State Relief Commissioner',
        notes: 'Approved for urgent dispatch.',
      },
      {
        status: 'DISPATCHED',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000),
        updatedBy: 'Chennai Port Depot Manager',
        notes: 'Vehicle TN-01-G-4521 departed depot.',
      },
      {
        status: 'COMPLETED',
        timestamp: new Date(Date.now() - 30 * 3600 * 1000),
        updatedBy: 'Santhome Shelter Incharge',
        notes: 'Stock received and accounted for in shelter storage.',
      },
    ],
  },
  {
    transferId: 'TRF-TN-802102',
    sourceWarehouse: 'Nagapattinam DDMA District Depot',
    destinationShelterId: 4,
    destinationShelterName: 'Velankanni Coastal Evacuation Hub',
    destinationDistrict: 'Nagapattinam',
    itemName: 'Ready-to-Eat Emergency Food Packets (MRE)',
    category: 'FOOD_RATIONS',
    quantity: 2000,
    deliveredQuantity: 0,
    unit: 'packets',
    status: 'DISPATCHED',
    priority: 'URGENT',
    requestedBy: 'P. Murugesan (Station Incharge)',
    approvedBy: 'District Collector Nagapattinam',
    carrierVehicleNo: 'TN-51-D-8820',
    driverName: 'S. Aruldas',
    driverPhone: '+91-98841-65432',
    dispatchedAt: new Date(Date.now() - 2 * 3600 * 1000),
    remarks: 'Convoy en route via East Coast Road.',
    timeline: [
      {
        status: 'REQUESTED',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000),
        updatedBy: 'P. Murugesan (Station Incharge)',
        notes: 'Requested buffer food packets for expected evacuees.',
      },
      {
        status: 'APPROVED',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000),
        updatedBy: 'District Collector Nagapattinam',
        notes: 'Approved allocation from central depot.',
      },
      {
        status: 'DISPATCHED',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000),
        updatedBy: 'Nagapattinam Depot Incharge',
        notes: 'Vehicle dispatched. ETA 1.5 hours.',
      },
    ],
  },
];

// Resilient in-memory transfers store when MongoDB Atlas is offline/standby
let inMemoryTransfers: any[] = BASELINE_TRANSFERS.map((t, idx) => ({
  _id: `mem_trf_${idx + 1}`,
  ...t,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export class MongoTransferController {
  /**
   * GET /api/mongo/transfers
   */
  public async getAllTransfers(req: Request, res: Response) {
    const { district, status, shelter } = req.query;

    if (!mongoDbService.isMongoConnected()) {
      let filtered = [...inMemoryTransfers];
      if (district && district !== 'ALL') {
        filtered = filtered.filter((t) => t.destinationDistrict.toLowerCase() === String(district).toLowerCase());
      }
      if (status && status !== 'ALL') {
        filtered = filtered.filter((t) => t.status === status);
      }
      if (shelter && shelter !== 'ALL') {
        filtered = filtered.filter((t) => t.destinationShelterName.toLowerCase() === String(shelter).toLowerCase());
      }

      return res.json({
        success: true,
        source: 'IN_MEMORY_FALLBACK (MongoDB Standby)',
        note: 'Serving from resilient in-memory fallback cache while MongoDB Atlas is in standby.',
        count: filtered.length,
        data: filtered,
      });
    }

    try {
      // Auto-seed if empty
      const count = await ReliefTransfer.countDocuments();
      if (count === 0) {
        await ReliefTransfer.insertMany(BASELINE_TRANSFERS);
      }

      const filter: any = {};
      if (district && district !== 'ALL') filter.destinationDistrict = district;
      if (status && status !== 'ALL') filter.status = status;
      if (shelter && shelter !== 'ALL') filter.destinationShelterName = shelter;

      const transfers = await ReliefTransfer.find(filter).sort({ createdAt: -1 });

      res.json({
        success: true,
        source: 'MongoDB Atlas (Relief Transfers Collection)',
        count: transfers.length,
        data: transfers,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve relief transfers',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/mongo/transfers/:id
   */
  public async getTransferById(req: Request, res: Response) {
    const { id } = req.params;

    if (!mongoDbService.isMongoConnected()) {
      const transfer = inMemoryTransfers.find((t) => t._id === id || t.transferId === id);
      if (!transfer) {
        return res.status(404).json({ success: false, message: 'Transfer not found in fallback storage.' });
      }
      return res.json({ success: true, source: 'IN_MEMORY_FALLBACK', data: transfer });
    }

    try {
      const transfer = await ReliefTransfer.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { transferId: id }],
      });

      if (!transfer) {
        return res.status(404).json({ success: false, message: 'Transfer not found.' });
      }

      res.json({ success: true, data: transfer });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/mongo/transfers
   * Initiates a new resource transfer request
   */
  public async createTransfer(req: Request, res: Response) {
    try {
      const {
        sourceWarehouse,
        destinationShelterId,
        destinationShelterName,
        destinationDistrict,
        itemName,
        category,
        quantity,
        unit,
        priority,
        requestedBy,
        remarks,
      } = req.body;

      if (
        !sourceWarehouse ||
        !destinationShelterName ||
        !destinationDistrict ||
        !itemName ||
        !category ||
        !quantity ||
        !unit ||
        !requestedBy
      ) {
        return res.status(400).json({
          success: false,
          message: 'All transfer fields (sourceWarehouse, destinationShelterName, district, item, category, quantity, unit, requestedBy) are required.',
        });
      }

      const numQuantity = Number(quantity);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Transfer quantity must be a positive number greater than zero.',
        });
      }

      const transferId = `TRF-TN-${Date.now().toString().slice(-6)}`;

      if (!mongoDbService.isMongoConnected()) {
        const newTransfer = {
          _id: `mem_trf_${Date.now()}`,
          transferId,
          sourceWarehouse: sourceWarehouse.trim(),
          destinationShelterId: Number(destinationShelterId) || 1,
          destinationShelterName: destinationShelterName.trim(),
          destinationDistrict: destinationDistrict.trim(),
          itemName: itemName.trim(),
          category,
          quantity: numQuantity,
          deliveredQuantity: 0,
          unit: unit.trim(),
          priority: priority || 'URGENT',
          status: 'REQUESTED' as TransferStatus,
          requestedBy: requestedBy.trim(),
          remarks: remarks?.trim(),
          timeline: [
            {
              status: 'REQUESTED',
              timestamp: new Date(),
              updatedBy: requestedBy.trim(),
              notes: remarks?.trim() || 'Emergency transfer requested.',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        inMemoryTransfers.unshift(newTransfer);

        return res.status(201).json({
          success: true,
          source: 'IN_MEMORY_FALLBACK (MongoDB Standby)',
          message: `Transfer ${transferId} created successfully.`,
          data: newTransfer,
        });
      }

      const newTransfer = new ReliefTransfer({
        transferId,
        sourceWarehouse: sourceWarehouse.trim(),
        destinationShelterId: Number(destinationShelterId) || 1,
        destinationShelterName: destinationShelterName.trim(),
        destinationDistrict: destinationDistrict.trim(),
        itemName: itemName.trim(),
        category,
        quantity: numQuantity,
        deliveredQuantity: 0,
        unit: unit.trim(),
        priority: priority || 'URGENT',
        status: 'REQUESTED',
        requestedBy: requestedBy.trim(),
        remarks: remarks?.trim(),
        timeline: [
          {
            status: 'REQUESTED',
            timestamp: new Date(),
            updatedBy: requestedBy.trim(),
            notes: remarks?.trim() || 'Emergency transfer requested.',
          },
        ],
      });

      const saved = await newTransfer.save();

      res.status(201).json({
        success: true,
        message: `Transfer ${transferId} created successfully.`,
        data: saved,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to create transfer request',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/mongo/transfers/:id/status
   * Updates transfer workflow status: REQUESTED -> APPROVED -> DISPATCHED -> COMPLETED
   */
  public async updateTransferStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, updatedBy, notes, carrierVehicleNo, driverName, driverPhone, deliveredQuantity } = req.body;

      const validStatuses: TransferStatus[] = [
        'REQUESTED',
        'APPROVED',
        'DISPATCHED',
        'PARTIALLY_DELIVERED',
        'COMPLETED',
        'CANCELLED',
      ];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      if (!mongoDbService.isMongoConnected()) {
        const transfer = inMemoryTransfers.find((t) => t._id === id || t.transferId === id);
        if (!transfer) {
          return res.status(404).json({ success: false, message: 'Transfer not found in fallback storage.' });
        }

        transfer.status = status;
        if (carrierVehicleNo) transfer.carrierVehicleNo = carrierVehicleNo;
        if (driverName) transfer.driverName = driverName;
        if (driverPhone) transfer.driverPhone = driverPhone;
        if (deliveredQuantity !== undefined) transfer.deliveredQuantity = Number(deliveredQuantity);

        if (status === 'APPROVED') {
          transfer.approvedBy = updatedBy || 'District Relief Controller';
        } else if (status === 'DISPATCHED') {
          transfer.dispatchedAt = new Date();
        } else if (status === 'COMPLETED') {
          transfer.completedAt = new Date();
          transfer.receivedBy = updatedBy || 'Shelter Officer';
          transfer.deliveredQuantity = transfer.deliveredQuantity || transfer.quantity;
          updateInMemoryStock(
            transfer.destinationShelterName,
            transfer.itemName,
            transfer.deliveredQuantity,
            transfer.destinationDistrict,
            transfer.category,
            transfer.unit
          );
        }

        transfer.timeline.push({
          status,
          timestamp: new Date(),
          updatedBy: updatedBy || 'Operational Officer',
          notes: notes || `Transfer status transitioned to ${status}`,
        });
        transfer.updatedAt = new Date();

        return res.json({
          success: true,
          source: 'IN_MEMORY_FALLBACK (MongoDB Standby)',
          message: `Transfer ${transfer.transferId} updated to ${status}.`,
          data: transfer,
        });
      }

      const transfer = await ReliefTransfer.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { transferId: id }],
      });

      if (!transfer) {
        return res.status(404).json({ success: false, message: 'Transfer not found.' });
      }

      transfer.status = status;
      if (carrierVehicleNo) transfer.carrierVehicleNo = carrierVehicleNo;
      if (driverName) transfer.driverName = driverName;
      if (driverPhone) transfer.driverPhone = driverPhone;
      if (deliveredQuantity !== undefined) transfer.deliveredQuantity = Number(deliveredQuantity);

      if (status === 'APPROVED') {
        transfer.approvedBy = updatedBy || 'District Relief Controller';
      } else if (status === 'DISPATCHED') {
        transfer.dispatchedAt = new Date();
      } else if (status === 'COMPLETED') {
        transfer.completedAt = new Date();
        transfer.receivedBy = updatedBy || 'Shelter Officer';
        transfer.deliveredQuantity = transfer.deliveredQuantity || transfer.quantity;

        // Automatically update or insert into ReliefItem stockpile for destination shelter
        try {
          const existingStock = await ReliefItem.findOne({
            shelterName: transfer.destinationShelterName,
            itemName: transfer.itemName,
          });

          if (existingStock) {
            existingStock.quantity += transfer.deliveredQuantity;
            await existingStock.save();
          } else {
            await ReliefItem.create({
              itemName: transfer.itemName,
              shelterName: transfer.destinationShelterName,
              districtName: transfer.destinationDistrict,
              category: transfer.category as any,
              quantity: transfer.deliveredQuantity,
              unit: transfer.unit,
              criticalThreshold: Math.max(50, Math.round(transfer.deliveredQuantity * 0.2)),
              stockStatus: 'SUFFICIENT',
              notes: `Received via Transfer ${transfer.transferId} from ${transfer.sourceWarehouse}`,
              dataSource: 'Transfer Delivery Confirmation',
            });
          }
        } catch (stockErr: any) {
          console.warn('[MongoTransfer] Failed to auto-update stockpile:', stockErr.message);
        }
      }

      transfer.timeline.push({
        status,
        timestamp: new Date(),
        updatedBy: updatedBy || 'Operational Officer',
        notes: notes || `Transfer status transitioned to ${status}`,
      });

      const updated = await transfer.save();

      res.json({
        success: true,
        message: `Transfer ${transfer.transferId} updated to ${status}.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/mongo/inventory/consumption
   * Calculates consumption estimates and autonomy based on shelter occupancy and stock
   */
  public async getConsumptionEstimates(req: Request, res: Response) {
    try {
      const shelters = await shelterService.getAllShelters();
      let inventoryItems: any[] = [];

      if (mongoDbService.isMongoConnected()) {
        inventoryItems = await ReliefItem.find();
      } else {
        inventoryItems = getInMemoryInventory();
      }

      // Daily ration standards (Sphere Humanitarian Standards)
      const STANDARDS = {
        DRINKING_WATER_LITERS_PER_PERSON_DAY: 3.0,
        FOOD_PACKETS_PER_PERSON_DAY: 2.0,
        BLANKETS_PER_PERSON: 1.0,
      };

      const estimates = shelters.map((shelter) => {
        // Assume baseline occupancy of at least 150 during watch/advisory if currently 0
        const effectiveOccupancy = shelter.currentOccupancy > 0 ? shelter.currentOccupancy : 150;
        const shelterItems = inventoryItems.filter(
          (i) => i.shelterName.toLowerCase() === shelter.name.toLowerCase()
        );

        const waterItem = shelterItems.find((i) => i.category === 'DRINKING_WATER');
        const foodItem = shelterItems.find((i) => i.category === 'FOOD_RATIONS');

        const waterLiters = waterItem ? waterItem.quantity : 0;
        const foodUnits = foodItem ? foodItem.quantity : 0;

        const waterDailyNeed = effectiveOccupancy * STANDARDS.DRINKING_WATER_LITERS_PER_PERSON_DAY;
        const foodDailyNeed = effectiveOccupancy * STANDARDS.FOOD_PACKETS_PER_PERSON_DAY;

        const waterDaysRemaining = waterDailyNeed > 0 ? parseFloat((waterLiters / waterDailyNeed).toFixed(1)) : 0;
        const foodDaysRemaining = foodDailyNeed > 0 ? parseFloat((foodUnits / foodDailyNeed).toFixed(1)) : 0;

        return {
          shelterId: shelter.id,
          shelterName: shelter.name,
          district: shelter.districtName,
          totalCapacity: shelter.totalCapacity,
          currentOccupancy: shelter.currentOccupancy,
          effectiveOccupancy,
          stocks: {
            drinkingWaterLiters: waterLiters,
            waterDailyConsumptionEst: waterDailyNeed,
            waterAutonomyDays: waterDaysRemaining,
            waterShortageRisk: waterDaysRemaining < 2 ? 'HIGH' : waterDaysRemaining < 4 ? 'MODERATE' : 'LOW',
            foodPackets: foodUnits,
            foodDailyConsumptionEst: foodDailyNeed,
            foodAutonomyDays: foodDaysRemaining,
            foodShortageRisk: foodDaysRemaining < 2 ? 'HIGH' : foodDaysRemaining < 4 ? 'MODERATE' : 'LOW',
          },
        };
      });

      res.json({
        success: true,
        source: mongoDbService.isMongoConnected() ? 'MongoDB Atlas' : 'IN_MEMORY_FALLBACK (MongoDB Standby)',
        methodology: 'Sphere Humanitarian Minimum Relief Standards',
        assumptions: {
          drinkingWaterPerPersonPerDay: '3.0 Liters',
          foodPacketsPerPersonPerDay: '2.0 Meal Packets',
          defaultActiveOccupancyEstimate: '150 evacuees minimum standby assumption if current headcount is 0',
        },
        sheltersCount: estimates.length,
        data: estimates,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const mongoTransferController = new MongoTransferController();