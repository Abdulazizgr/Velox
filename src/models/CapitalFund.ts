import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICapitalFund extends Document {
  totalCapital: number;
  remainingBalance: number;
  lastUpdated: Date;
}

const CapitalFundSchema = new Schema<ICapitalFund>(
  {
    totalCapital: { type: Number, required: true, default: 0 },
    remainingBalance: { type: Number, required: true, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const CapitalFund: Model<ICapitalFund> =
  mongoose.models.CapitalFund ||
  mongoose.model<ICapitalFund>("CapitalFund", CapitalFundSchema);

