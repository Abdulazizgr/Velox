import mongoose, { Schema, Document, Model } from "mongoose";

export type SessionPricingType = "WEEKDAY" | "WEEKEND";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PAID" | "UNPAID";
export type PaymentMethod = "CASH" | "TELEBIRR" | "CBE";

export interface IShoeSwapLog {
  oldShoeId: string;
  newShoeId: string;
  swappedAt: Date;
  reason?: string;
}

export interface ISessionExtensionLog {
  addedMinutes: number;
  additionalFee: number;
  requestedAt: Date;
}

export interface IRentalSession extends Document {
  shoeId: string; // Current assigned Shoe ID
  shoeSize: number;
  skateType?: "INLINE" | "QUAD";
  shoeColor?: string;
  customerName?: string;
  customerPhone?: string;
  baseDurationMinutes: number; // 30 or 60
  gracePeriodMinutes: number;  // Default 5
  totalMinutes: number;        // base + grace + extensions
  startedAt: Date;
  expectedEndTime: Date;
  actualReturnTime?: Date;
  basePrice: number;
  extensionPrice: number;
  totalRentalFee: number;
  pricingType: SessionPricingType;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  shoeSwaps: IShoeSwapLog[];
  extensions: ISessionExtensionLog[];
  registeredByStaffId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RentalSessionSchema = new Schema<IRentalSession>(
  {
    shoeId: {
      type: String,
      required: true,
      index: true,
    },
    shoeSize: {
      type: Number,
      required: true,
    },
    skateType: {
      type: String,
      enum: ["INLINE", "QUAD"],
      default: "INLINE",
    },
    shoeColor: {
      type: String,
      default: "",
    },
    customerName: {
      type: String,
      default: "Skater",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    baseDurationMinutes: {
      type: Number,
      required: true, // 30 or 60
    },
    gracePeriodMinutes: {
      type: Number,
      default: 5,
    },
    totalMinutes: {
      type: Number,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expectedEndTime: {
      type: Date,
      required: true,
      index: true,
    },
    actualReturnTime: {
      type: Date,
    },
    basePrice: {
      type: Number,
      required: true,
    },
    extensionPrice: {
      type: Number,
      default: 0,
    },
    totalRentalFee: {
      type: Number,
      required: true,
    },
    pricingType: {
      type: String,
      enum: ["WEEKDAY", "WEEKEND"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "UNPAID"],
      default: "UNPAID",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "TELEBIRR", "CBE"],
    },
    shoeSwaps: [
      {
        oldShoeId: String,
        newShoeId: String,
        swappedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    extensions: [
      {
        addedMinutes: Number,
        additionalFee: Number,
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    registeredByStaffId: {
      type: String,
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

export const RentalSession: Model<IRentalSession> =
  mongoose.models.RentalSession ||
  mongoose.model<IRentalSession>("RentalSession", RentalSessionSchema);

