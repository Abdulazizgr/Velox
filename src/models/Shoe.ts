import mongoose, { Schema, Document, Model } from "mongoose";

export type ShoeStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE" | "RETIRED";
export type SkateType = "INLINE" | "QUAD";
export type ExtendedSizeType = "EXTENDED_SMALL" | "EXTENDED_MEDIUM" | "EXTENDED_LARGE";

export interface IShoe extends Document {
  shoeId: string; // Unique asset tag, e.g. "SK-40-01"
  size: number;   // Normal commercial shoe size or primary base size, e.g. 40
  isExtended?: boolean; // True if adjustable multi-size skate
  extendedType?: ExtendedSizeType; // "EXTENDED_SMALL" | "EXTENDED_MEDIUM" | "EXTENDED_LARGE"
  coveredSizes?: number[]; // Array of covered sizes, e.g. [35, 36, 37]
  type: SkateType; // "INLINE" (Inline Skates) | "QUAD" (Quads)
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
    isExtended: {
      type: Boolean,
      default: false,
      index: true,
    },
    extendedType: {
      type: String,
      enum: ["EXTENDED_SMALL", "EXTENDED_MEDIUM", "EXTENDED_LARGE"],
      index: true,
    },
    coveredSizes: {
      type: [Number],
      default: [],
    },
    type: {
      type: String,
      enum: ["INLINE", "QUAD"],
      default: "INLINE",
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
