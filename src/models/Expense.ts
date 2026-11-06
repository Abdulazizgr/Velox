import mongoose, { Schema, Document, Model } from "mongoose";

export type ExpenseFundSource = "DAILY_CASH" | "CAPITAL";

export interface IExpense extends Document {
  title: string;
  amount: number;
  category: string;
  fundSource: ExpenseFundSource;
  paymentMethod: "CASH" | "TELEBIRR" | "CBE";
  notes?: string;
  date: Date;
  recordedByStaffId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    fundSource: {
      type: String,
      enum: ["DAILY_CASH", "CAPITAL"],
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "TELEBIRR", "CBE"],
      default: "CASH",
    },
    notes: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    recordedByStaffId: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
