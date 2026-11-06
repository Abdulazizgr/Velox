import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpenseCategory extends Document {
  name: string; // Unique key e.g. "LUNCH", "UTILITIES"
  displayName: string; // Formatted label e.g. "Staff Lunch", "Electricity & Utilities"
  fundSource: "DAILY_CASH" | "CAPITAL" | "BOTH";
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema = new Schema<IExpenseCategory>(
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
    fundSource: {
      type: String,
      enum: ["DAILY_CASH", "CAPITAL", "BOTH"],
      default: "BOTH",
    },
  },
  {
    timestamps: true,
  }
);

export const ExpenseCategory: Model<IExpenseCategory> =
  mongoose.models.ExpenseCategory ||
  mongoose.model<IExpenseCategory>("ExpenseCategory", ExpenseCategorySchema);
