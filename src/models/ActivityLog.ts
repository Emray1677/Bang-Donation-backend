import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  user_id?: mongoose.Types.ObjectId;
  action: string;
  resource_type: string;
  resource_id?: mongoose.Types.ObjectId;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource_type: {
      type: String,
      required: true,
    },
    resource_id: {
      type: Schema.Types.ObjectId,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Indexes
ActivityLogSchema.index({ user_id: 1, created_at: -1 });
ActivityLogSchema.index({ action: 1, created_at: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

