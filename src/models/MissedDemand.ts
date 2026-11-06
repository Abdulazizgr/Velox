import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMissedDemand extends Document {
  shoeSize: number;
  skateType?: "INLINE" | "QUAD";
  date: Date;
  recordedByStaffId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MissedDemandSchema = new Schema<IMissedDemand>(
  {
    shoeSize: { type: Number, required: true, index: true },
    skateType: { type: String, enum: ["INLINE", "QUAD"], default: "INLINE" },
    date: { type: Date, default: Date.now, index: true },
    recordedByStaffId: { type: String },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const MissedDemand: Model<IMissedDemand> =
  mongoose.models.MissedDemand ||
  mongoose.model<IMissedDemand>("MissedDemand", MissedDemandSchema);
