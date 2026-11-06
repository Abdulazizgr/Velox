import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  name: string; // Internal identifier, uppercase trimmed, e.g. "BEVERAGE", "SNACK", "ICE_CREAM"
  displayName: string; // Human label, e.g. "Drinks & Water", "Ice Cream"
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
