import mongoose, { Document, Schema } from 'mongoose';

export interface IDonation extends Document {
  user_id: mongoose.Types.ObjectId;
  amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_method_id?: mongoose.Types.ObjectId; // References PaymentMethod
  reason_id?: mongoose.Types.ObjectId; // References DonationReason
  message?: string;
  is_anonymous: boolean;
  gift_card_code?: string; // For gift card payments
  receipt_image?: string; // For receipt uploads
  wallet_address?: string; // For crypto payments
  paypal_email?: string; // For PayPal payments
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
    payment_method_id: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod',
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
    gift_card_code: {
      type: String,
      maxlength: [100, 'Gift card code cannot exceed 100 characters'],
    },
    receipt_image: {
      type: String, // URL to uploaded image
    },
    wallet_address: {
      type: String,
      maxlength: [500, 'Wallet address cannot exceed 500 characters'],
    },
    paypal_email: {
      type: String,
      maxlength: [255, 'PayPal email cannot exceed 255 characters'],
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

