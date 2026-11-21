import mongoose, { Schema, type InferSchemaType } from "mongoose";

const collectionSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    eyebrow: { type: String, default: "" },
    description: { type: String, default: "" },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    featured: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CollectionDoc = InferSchemaType<typeof collectionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Collection = mongoose.model("Collection", collectionSchema);
