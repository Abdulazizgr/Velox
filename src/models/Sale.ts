import mongoose, { Schema, Document, Model } from "mongoose";

export type SaleType = "TAB" | "WALK_IN";
export type SalePaymentStatus = "PAID" | "UNPAID";
export type SalePaymentMethod = "CASH" | "TELEBIRR" | "CBE";

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ISale extends Document {
  rentalSessionId?: mongoose.Types.ObjectId; // Attached to skater if tab
  shoeId?: string; // Quick reference if tab
  saleType: SaleType;
  items: ISaleItem[];
  totalAmount: number;
  paymentStatus: SalePaymentStatus;
  paymentMethod?: SalePaymentMethod;
  registeredByStaffId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    rentalSessionId: {
      type: Schema.Types.ObjectId,
      ref: "RentalSession",
      index: true,
    },
    shoeId: {
      type: String,
      index: true,
    },
    saleType: {
      type: String,
      enum: ["TAB", "WALK_IN"],
      default: "WALK_IN",
    },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
        subtotal: { type: Number, required: true },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "UNPAID"],
      default: "PAID",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "TELEBIRR", "CBE"],
    },
    registeredByStaffId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Sale: Model<ISale> =
  mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);

