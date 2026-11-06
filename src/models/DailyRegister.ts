import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyRegister extends Document {
  date: string; // "YYYY-MM-DD" unique
  openingCash: number;
  cashInTotal: number;
  telebirrTotal: number;
  cbeTotal: number;
  dailyExpensesTotal: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  discrepancy?: number;
  status: "OPEN" | "CLOSED";
  openedByStaffId?: string;
  closedByStaffId?: string;
  notes?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyRegisterSchema = new Schema<IDailyRegister>(
  {
    date: { type: String, required: true, unique: true, index: true },
    openingCash: { type: Number, default: 0 },
    cashInTotal: { type: Number, default: 0 },
    telebirrTotal: { type: Number, default: 0 },
    cbeTotal: { type: Number, default: 0 },
    dailyExpensesTotal: { type: Number, default: 0 },
    expectedClosingCash: { type: Number, default: 0 },
    actualClosingCash: { type: Number },
    discrepancy: { type: Number, default: 0 },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    openedByStaffId: { type: String },
    closedByStaffId: { type: String },
    notes: { type: String, default: "" },
    closedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const DailyRegister: Model<IDailyRegister> =
  mongoose.models.DailyRegister ||
  mongoose.model<IDailyRegister>("DailyRegister", DailyRegisterSchema);
