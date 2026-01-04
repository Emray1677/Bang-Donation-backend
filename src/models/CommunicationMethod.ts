import mongoose, { Document, Schema } from 'mongoose';

export interface ICommunicationMethod extends Document {
  name: string;
  type: 'email' | 'telegram' | 'whatsapp' | 'phone' | 'other';
  value: string; // email address, telegram handle, phone number, etc.
  icon?: string; // icon name or URL
  is_active: boolean;
  order: number; // Display order
  created_at: Date;
  updated_at: Date;
}

const CommunicationMethodSchema = new Schema<ICommunicationMethod>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['email', 'telegram', 'whatsapp', 'phone', 'other'],
      required: [true, 'Type is required'],
    },
    value: {
      type: String,
      required: [true, 'Value is required'],
      trim: true,
    },
    icon: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
CommunicationMethodSchema.index({ is_active: 1, order: 1 });
CommunicationMethodSchema.index({ type: 1 });

export default mongoose.model<ICommunicationMethod>('CommunicationMethod', CommunicationMethodSchema);

