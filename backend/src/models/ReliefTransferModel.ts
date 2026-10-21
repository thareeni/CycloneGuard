import mongoose, { Schema, Document } from 'mongoose';

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
  timestamp: Date;
  updatedBy: string;
  notes?: string;
}

export interface IReliefTransfer extends Document {
  transferId: string;
  sourceWarehouse: string;
  destinationShelterId: number;
  destinationShelterName: string;
  destinationDistrict: string;
  itemId?: mongoose.Types.ObjectId;
  itemName: string;
  category: string;
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
  dispatchedAt?: Date;
  receivedBy?: string;
  completedAt?: Date;
  remarks?: string;
  timeline: ITransferTimeline[];
  createdAt: Date;
  updatedAt: Date;
}

const TransferTimelineSchema: Schema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['REQUESTED', 'APPROVED', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED'],
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: String, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const ReliefTransferSchema: Schema = new Schema(
  {
    transferId: { type: String, required: true, unique: true, index: true },
    sourceWarehouse: { type: String, required: true, trim: true },
    destinationShelterId: { type: Number, required: true, index: true },
    destinationShelterName: { type: String, required: true, trim: true },
    destinationDistrict: { type: String, required: true, trim: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'ReliefItem' },
    itemName: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'FOOD_RATIONS',
        'DRINKING_WATER',
        'MEDICAL_KITS',
        'BEDDING_BLANKETS',
        'GENERATORS_FUEL',
        'TARPAULIN_SHEETS',
        'RESCUE_GEAR',
        'COMMUNICATION_GEAR',
      ],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Transfer quantity must be at least 1 unit'],
    },
    deliveredQuantity: { type: Number, min: 0, default: 0 },
    unit: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['REQUESTED', 'APPROVED', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED'],
      default: 'REQUESTED',
      index: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
      default: 'URGENT',
    },
    requestedBy: { type: String, required: true, trim: true },
    approvedBy: { type: String, trim: true },
    carrierVehicleNo: { type: String, trim: true },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    dispatchedAt: { type: Date },
    receivedBy: { type: String, trim: true },
    completedAt: { type: Date },
    remarks: { type: String, trim: true },
    timeline: [TransferTimelineSchema],
  },
  {
    timestamps: true,
  }
);

export const ReliefTransfer = mongoose.model<IReliefTransfer>('ReliefTransfer', ReliefTransferSchema);
