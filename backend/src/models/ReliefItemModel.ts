import mongoose, { Schema, Document } from 'mongoose';

export interface IReliefItem extends Document {
  itemName: string;
  shelterName: string;
  districtName: string;
  category: 'FOOD_RATIONS' | 'DRINKING_WATER' | 'MEDICAL_KITS' | 'BEDDING_BLANKETS' | 'GENERATORS_FUEL' | 'TARPAULIN_SHEETS' | 'RESCUE_GEAR' | 'COMMUNICATION_GEAR';
  quantity: number;
  unit: string;
  criticalThreshold: number;
  stockStatus: 'SUFFICIENT' | 'LOW' | 'CRITICAL' | 'DEPLETED';
  notes?: string;
  dataSource: string;
  originType: 'MANUAL_OPERATIONAL';
  createdAt: Date;
  updatedAt: Date;
}

const ReliefItemSchema: Schema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    shelterName: { type: String, required: true, trim: true },
    districtName: { type: String, required: true, trim: true },
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
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    criticalThreshold: { type: Number, required: true, default: 50 },
    stockStatus: {
      type: String,
      required: true,
      enum: ['SUFFICIENT', 'LOW', 'CRITICAL', 'DEPLETED'],
      default: 'SUFFICIENT',
    },
    notes: { type: String, trim: true },
    dataSource: { type: String, default: 'Tamil Nadu State Relief Warehouse Log' },
    originType: { type: String, default: 'MANUAL_OPERATIONAL' },
  },
  {
    timestamps: true,
  }
);

// Auto-compute stockStatus before save based on criticalThreshold
ReliefItemSchema.pre('save', function () {
  const doc = this as any;
  if (doc.quantity === 0) {
    doc.stockStatus = 'DEPLETED';
  } else if (doc.quantity <= doc.criticalThreshold * 0.5) {
    doc.stockStatus = 'CRITICAL';
  } else if (doc.quantity <= doc.criticalThreshold) {
    doc.stockStatus = 'LOW';
  } else {
    doc.stockStatus = 'SUFFICIENT';
  }
});

export const ReliefItem = mongoose.model<IReliefItem>('ReliefItem', ReliefItemSchema);
