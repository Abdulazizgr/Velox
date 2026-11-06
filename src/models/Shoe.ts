import mongoose, { Schema, Document, Model } from "mongoose";

export type ShoeStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE" | "RETIRED";

export interface IShoe extends Document {
  shoeId: string; // Unique asset tag, e.g. "SK-40-01"
  size: number;   // Normal commercial shoe size, e.g. 40
  status: ShoeStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShoeSchema = new Schema<IShoe>(
  {
    shoeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    size: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "RENTED", "MAINTENANCE", "RETIRED"],
      default: "AVAILABLE",
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Shoe: Model<IShoe> =
  mongoose.models.Shoe || mongoose.model<IShoe>("Shoe", ShoeSchema);
