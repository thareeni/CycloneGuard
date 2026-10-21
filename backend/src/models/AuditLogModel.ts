import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetDistrict?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: string;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    actorEmail: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetResource: { type: String, required: true },
    targetDistrict: { type: String, index: true },
    status: { type: String, required: true, enum: ['SUCCESS', 'DENIED', 'FAILED'] },
    details: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// In-Memory fallback audit logs buffer (retains last 200 operations)
export const IN_MEMORY_AUDIT_LOGS: Array<{
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetDistrict?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: string;
  ipAddress?: string;
  timestamp: string;
}> = [];

export function recordAuditLog(entry: {
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetDistrict?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: string;
  ipAddress?: string;
}): void {
  const logItem = {
    id: `LOG-${Date.now().toString().slice(-8)}`,
    ...entry,
    timestamp: new Date().toISOString(),
  };

  IN_MEMORY_AUDIT_LOGS.unshift(logItem);
  if (IN_MEMORY_AUDIT_LOGS.length > 200) {
    IN_MEMORY_AUDIT_LOGS.pop();
  }

  // Also persist to MongoDB if available
  try {
    if (mongoose.connection.readyState === 1) {
      AuditLog.create(entry).catch((err) => {
        console.warn('[AuditLog] MongoDB persist warning:', err.message);
      });
    }
  } catch (err) {
    // Graceful fallback
  }
}
