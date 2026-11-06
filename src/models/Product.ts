import mongoose, { Schema, Document, Model } from "mongoose";

export type ProductCategory = "SNACK" | "BEVERAGE" | "OTHER";

export interface IProduct extends Document {
  name: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockAlert: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["SNACK", "BEVERAGE", "OTHER"],
      default: "SNACK",
    },
    costPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
    },
    minStockAlert: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
