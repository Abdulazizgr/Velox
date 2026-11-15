import mongoose, { Schema, Document, Model } from "mongoose";

export type CapitalSourceType =
  | "INITIAL"
  | "OWNER_EQUITY"
  | "LOAN"
  | "PARTNER"
  | "OTHER";

export interface ICapitalDeposit {
  _id?: string;
  amount: number;
  source: CapitalSourceType;
  sourceLabel: string;
  notes?: string;
  date: Date;
  depositedByStaffId?: string;
  depositedByName?: string;
}

export interface ICapitalFund extends Document {
  initialCapital: number;
  totalInjectedCapital: number;
  totalCapital: number;
  remainingBalance: number;
  deposits: ICapitalDeposit[];
  lastUpdated: Date;
}

const CapitalDepositSchema = new Schema<ICapitalDeposit>({
  amount: { type: Number, required: true },
  source: {
    type: String,
    enum: ["INITIAL", "OWNER_EQUITY", "LOAN", "PARTNER", "OTHER"],
    default: "OTHER",
  },
  sourceLabel: { type: String, default: "Capital Deposit" },
  notes: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  depositedByStaffId: { type: String },
  depositedByName: { type: String },
});

const CapitalFundSchema = new Schema<ICapitalFund>(
  {
    initialCapital: { type: Number, default: 0 },
    totalInjectedCapital: { type: Number, default: 0 },
    totalCapital: { type: Number, required: true, default: 0 },
    remainingBalance: { type: Number, required: true, default: 0 },
    deposits: { type: [CapitalDepositSchema], default: [] },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const CapitalFund: Model<ICapitalFund> =
  mongoose.models.CapitalFund ||
  mongoose.model<ICapitalFund>("CapitalFund", CapitalFundSchema);
