import mongoose, { Document, Schema } from 'mongoose';

export interface IDonationReason extends Document {
  title: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const DonationReasonSchema = new Schema<IDonationReason>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
DonationReasonSchema.index({ is_active: 1 });
DonationReasonSchema.index({ created_at: -1 });

export default mongoose.model<IDonationReason>('DonationReason', DonationReasonSchema);

