import mongoose, { Document, Schema } from 'mongoose';

export interface IDonation extends Document {
  user_id: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  donation_method?: string; // Now references CommunicationMethod
  reason_id?: mongoose.Types.ObjectId; // References DonationReason
  message?: string;
  is_anonymous: boolean;
  created_at: Date;
  confirmed_at?: Date;
  completed_at?: Date;
  payment_reference?: string;
}

const DonationSchema = new Schema<IDonation>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [500, 'Minimum donation amount is $500'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    donation_method: {
      type: String,
      ref: 'CommunicationMethod',
    },
    reason_id: {
      type: Schema.Types.ObjectId,
      ref: 'DonationReason',
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    is_anonymous: {
      type: Boolean,
      default: false,
    },
    confirmed_at: {
      type: Date,
    },
    completed_at: {
      type: Date,
    },
    payment_reference: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Indexes for better query performance
DonationSchema.index({ user_id: 1, created_at: -1 });
DonationSchema.index({ status: 1, created_at: -1 });
DonationSchema.index({ is_anonymous: 1 });

export default mongoose.model<IDonation>('Donation', DonationSchema);

