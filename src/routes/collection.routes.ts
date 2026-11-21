import { Router } from "express";
import { Collection } from "../models/Collection.js";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/errors.js";
import { mapProduct } from "../utils/mapProduct.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const collections = await Collection.find({ isPublished: true }).lean();
    res.json({
      success: true,
      collections: collections.map((c) => ({
        slug: c.slug,
        title: c.title,
        eyebrow: c.eyebrow,
        description: c.description,
        image: c.image?.url ?? "",
        featured: c.featured,
      })),
    });
  }),
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const collection = await Collection.findOne({
      slug: req.params.slug,
      isPublished: true,
    }).lean();
    if (!collection) throw notFound("Collection not found");
    const products = await Product.find({
      collectionSlug: collection.slug,
      isPublished: true,
    }).lean();
    res.json({
      success: true,
      collection: {
        slug: collection.slug,
        title: collection.title,
        eyebrow: collection.eyebrow,
        description: collection.description,
        image: collection.image?.url ?? "",
        featured: collection.featured,
      },
      products: products.map((p) => mapProduct(p as never)),
    });
  }),
);

export default router;
