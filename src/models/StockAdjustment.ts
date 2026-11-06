import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockAdjustment extends Document {
  productId: string;
  productName: string;
  category: string;
  previousStock: number;
  newStock: number;
  delta: number; // Negative for shrinkage/loss, positive for audit surplus
  reason: "DAMAGE" | "EXPIRED" | "INTERNAL_USE" | "INVENTORY_COUNT" | "CORRECTION" | "OTHER";
  reasonLabel: string;
  costValueLost: number; // delta * costPrice
  date: Date;
  recordedByStaffId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    category: { type: String, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    delta: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["DAMAGE", "EXPIRED", "INTERNAL_USE", "INVENTORY_COUNT", "CORRECTION", "OTHER"],
      default: "INVENTORY_COUNT",
      index: true,
    },
    reasonLabel: { type: String, default: "Physical Count" },
    costValueLost: { type: Number, default: 0 },
    date: { type: Date, default: Date.now, index: true },
    recordedByStaffId: { type: String },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const StockAdjustment: Model<IStockAdjustment> =
  mongoose.models.StockAdjustment ||
  mongoose.model<IStockAdjustment>("StockAdjustment", StockAdjustmentSchema);
