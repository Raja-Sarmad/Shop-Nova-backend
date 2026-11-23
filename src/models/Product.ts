import mongoose, { Schema, type InferSchemaType } from "mongoose";

const colorSchema = new Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, required: true },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number },
    category: {
      type: String,
      enum: ["shoes", "fragrance"],
      required: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ["men", "women", "unisex"],
      default: "unisex",
      index: true,
    },
    collectionSlug: { type: String, default: "signature-scents", index: true },
    images: { type: [imageSchema], default: [] },
    colors: { type: [colorSchema], default: [] },
    sizes: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
    isNew: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true, index: true },
    fabric: { type: String, default: "" },
    care: { type: [String], default: [] },
    details: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

productSchema.pre("save", function syncStock(next) {
  this.inStock = this.stockQuantity > 0;
  next();
});

export type ProductDoc = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Product = mongoose.model("Product", productSchema);
