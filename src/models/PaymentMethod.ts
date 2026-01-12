import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentMethod extends Document {
  name: string;
  type: 'gift_card' | 'bitcoin' | 'paypal' | 'other';
  label: string; // Custom label for input field
  requires_code: boolean; // Whether this method requires a code (gift card)
  requires_receipt: boolean; // Whether this method requires receipt photo
  requires_address: boolean; // Whether this method requires wallet address (bitcoin)
  requires_email: boolean; // Whether this method requires email (paypal)
  icon?: string; // Icon name or URL
  description?: string; // Method description
  caution_note?: string; // Admin's caution note for users
  receiving_account?: string; // Receiving account number/address (BTC wallet, PayPal email, etc.)
  is_active: boolean;
  order: number; // Display order
  created_at: Date;
  updated_at: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['gift_card', 'bitcoin', 'paypal', 'other'],
      required: [true, 'Type is required'],
    },
    label: {
      type: String,
      required: [true, 'Label is required'],
      trim: true,
      maxlength: [100, 'Label cannot exceed 100 characters'],
    },
    requires_code: {
      type: Boolean,
      default: false,
    },
    requires_receipt: {
      type: Boolean,
      default: false,
    },
    requires_address: {
      type: Boolean,
      default: false,
    },
    requires_email: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    caution_note: {
      type: String,
      maxlength: [1000, 'Caution note cannot exceed 1000 characters'],
    },
    receiving_account: {
      type: String,
      maxlength: [500, 'Receiving account cannot exceed 500 characters'],
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
PaymentMethodSchema.index({ is_active: 1, order: 1 });
PaymentMethodSchema.index({ type: 1 });

export default mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);
