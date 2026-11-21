import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Model } from "mongoose";
import bcrypt from "bcryptjs";

type UserMethods = {
  comparePassword(candidate: string): Promise<boolean>;
};

const addressSchema = new Schema(
  {
    label: { type: String, default: "Home" },
    fullName: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    region: { type: String, required: true },
    postalCode: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      index: true,
    },
    phone: { type: String, default: "" },
    addresses: { type: [addressSchema], default: [] },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>, UserMethods>;

export const User = mongoose.model<InferSchemaType<typeof userSchema>, Model<InferSchemaType<typeof userSchema>, object, UserMethods>>(
  "User",
  userSchema,
);
