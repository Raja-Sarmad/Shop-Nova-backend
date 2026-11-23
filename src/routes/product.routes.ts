import { Router } from "express";
import { z } from "zod";
import slugify from "slugify";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, notFound } from "../utils/errors.js";
import { mapProduct } from "../utils/mapProduct.js";
import { protect, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { deleteCloudinaryImage, uploadImageBuffer } from "../config/cloudinary.js";

const router = Router();

const productBody = z.object({
  name: z.string().min(2),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().positive().optional().or(z.literal("")),
  category: z.enum(["shoes", "fragrance"]),
  gender: z.enum(["men", "women", "unisex"]).optional(),
  collectionSlug: z.string().optional(),
  colors: z.union([z.string(), z.array(z.any())]).optional(),
  sizes: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  care: z.union([z.string(), z.array(z.string())]).optional(),
  details: z.union([z.string(), z.array(z.string())]).optional(),
  fabric: z.string().optional(),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  isNew: z.union([z.boolean(), z.string()]).optional(),
  isBestseller: z.union([z.boolean(), z.string()]).optional(),
  isPublished: z.union([z.boolean(), z.string()]).optional(),
  slug: z.string().optional(),
  existingImages: z.string().optional(),
  primaryImageIndex: z.coerce.number().int().min(0).optional(),
  imagePlan: z.string().optional(),
});

function withPrimaryFirst<T>(images: T[], primaryIndex?: number) {
  if (!images.length || primaryIndex === undefined || Number.isNaN(primaryIndex)) {
    return images;
  }
  const index = Math.min(Math.max(primaryIndex, 0), images.length - 1);
  if (index === 0) return images;
  const next = [...images];
  const [picked] = next.splice(index, 1);
  next.unshift(picked);
  return next;
}

function buildImagesFromPlan(
  planRaw: string | undefined,
  keepImages: { url: string; publicId: string }[],
  uploaded: { url: string; publicId: string }[],
  primaryImageIndex?: number,
) {
  if (planRaw) {
    try {
      const plan = JSON.parse(planRaw) as Array<
        | { type: "existing"; url: string; publicId?: string }
        | { type: "new"; index: number }
      >;
      if (Array.isArray(plan) && plan.length) {
        const built: { url: string; publicId: string }[] = [];
        for (const step of plan) {
          if (step.type === "existing") {
            built.push({ url: step.url, publicId: step.publicId ?? "" });
          } else if (step.type === "new" && uploaded[step.index]) {
            built.push(uploaded[step.index]);
          }
        }
        if (built.length) return withPrimaryFirst(built, primaryImageIndex);
      }
    } catch {
      /* fall through */
    }
  }
  return withPrimaryFirst([...keepImages, ...uploaded], primaryImageIndex);
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseColors(value: unknown) {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(",").map((part) => {
        const [name, hex] = part.split(":").map((s) => s.trim());
        return { name: name || "Default", hex: hex || "#C8B59A" };
      });
    }
  }
  if (Array.isArray(value)) return value;
  return [];
}

function asBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

/** Public catalog */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      q,
      category,
      gender,
      collection,
      sort = "featured",
      filter: catalogFilter,
      minPrice,
      maxPrice,
      published = "true",
    } = req.query;

    const filter: Record<string, unknown> = {};
    // Default: live catalog. Dashboard passes published=all
    if (String(published) !== "all") {
      filter.isPublished = true;
    }
    if (category && category !== "all") filter.category = category;
    if (gender === "men" || gender === "women") {
      filter.gender = { $in: [gender, "unisex"] };
    } else if (gender === "unisex") {
      filter.gender = "unisex";
    }
    if (collection) filter.collectionSlug = collection;
    if (catalogFilter === "new") filter.isNew = true;
    if (catalogFilter === "bestseller") filter.isBestseller = true;
    if (catalogFilter === "sale") {
      filter.compareAtPrice = { $exists: true, $gt: 0 };
    }
    if (q) {
      filter.$or = [
        { name: { $regex: String(q), $options: "i" } },
        { subtitle: { $regex: String(q), $options: "i" } },
        { tags: { $regex: String(q), $options: "i" } },
      ];
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) (filter.price as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (filter.price as Record<string, number>).$lte = Number(maxPrice);
    }

    let query = Product.find(filter);
    switch (sort) {
      case "newest":
        query = query.sort({ createdAt: -1 });
        break;
      case "price-asc":
        query = query.sort({ price: 1 });
        break;
      case "price-desc":
        query = query.sort({ price: -1 });
        break;
      case "rating":
        query = query.sort({ rating: -1 });
        break;
      default:
        query = query.sort({ isBestseller: -1, createdAt: -1 });
    }

    const products = await query.lean();
    res.json({ success: true, products: products.map((p) => mapProduct(p as never)) });
  }),
);

router.get(
  "/slug/:slug",
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({
      slug: req.params.slug,
      isPublished: true,
    }).lean();
    if (!product) throw notFound("Product not found");
    res.json({ success: true, product: mapProduct(product as never) });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).lean();
    if (!product) throw notFound("Product not found");
    res.json({ success: true, product: mapProduct(product as never) });
  }),
);

/** Admin: create with optional image files */
router.post(
  "/",
  protect,
  requireAdmin,
  upload.array("images", 8),
  asyncHandler(async (req, res) => {
    const body = productBody.parse(req.body);
    const baseSlug =
      body.slug ||
      slugify(body.name, { lower: true, strict: true });
    let slug = baseSlug;
    let n = 1;
    while (await Product.exists({ slug })) {
      slug = `${baseSlug}-${n++}`;
    }

    const files = (req.files as Express.Multer.File[]) ?? [];
    const uploaded = [];
    for (const file of files) {
      const result = await uploadImageBuffer(file.buffer);
      uploaded.push({ url: result.url, publicId: result.publicId });
    }

    const stockQuantity = body.stockQuantity ?? 0;
    const product = await Product.create({
      name: body.name,
      slug,
      subtitle: body.subtitle ?? "",
      description: body.description ?? "",
      price: body.price,
      compareAtPrice:
        body.compareAtPrice === "" || body.compareAtPrice === undefined
          ? undefined
          : Number(body.compareAtPrice),
      category: body.category,
      gender: body.gender ?? "unisex",
      collectionSlug:
        body.collectionSlug ||
        (body.category === "shoes" ? "everyday-footwear" : "signature-scents"),
      images: buildImagesFromPlan(
        body.imagePlan,
        [],
        uploaded,
        body.primaryImageIndex,
      ),
      colors: parseColors(body.colors),
      sizes: parseList(body.sizes),
      tags: parseList(body.tags),
      care: parseList(body.care),
      details: parseList(body.details),
      fabric: body.fabric ?? "",
      stockQuantity,
      inStock: stockQuantity > 0,
      isNew: asBool(body.isNew, true),
      isBestseller: asBool(body.isBestseller),
      isPublished: asBool(body.isPublished, true),
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, product: mapProduct(product) });
  }),
);

router.put(
  "/:id",
  protect,
  requireAdmin,
  upload.array("images", 8),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound("Product not found");

    const body = productBody.partial().parse(req.body);

    if (body.name) product.name = body.name;
    if (body.slug) product.slug = body.slug;
    if (body.subtitle !== undefined) product.subtitle = body.subtitle;
    if (body.description !== undefined) product.description = body.description;
    if (body.price !== undefined) product.price = body.price;
    if (body.compareAtPrice !== undefined) {
      product.compareAtPrice =
        body.compareAtPrice === "" ? undefined : Number(body.compareAtPrice);
    }
    if (body.category) product.category = body.category;
    if (body.gender) product.gender = body.gender;
    if (body.collectionSlug) product.collectionSlug = body.collectionSlug;
    if (body.colors !== undefined) product.colors = parseColors(body.colors) as never;
    if (body.sizes !== undefined) product.sizes = parseList(body.sizes);
    if (body.tags !== undefined) product.tags = parseList(body.tags);
    if (body.care !== undefined) product.care = parseList(body.care);
    if (body.details !== undefined) product.details = parseList(body.details);
    if (body.fabric !== undefined) product.fabric = body.fabric;
    if (body.stockQuantity !== undefined) {
      product.stockQuantity = body.stockQuantity;
      product.inStock = body.stockQuantity > 0;
    }
    if (body.isNew !== undefined) product.isNew = asBool(body.isNew);
    if (body.isBestseller !== undefined) product.isBestseller = asBool(body.isBestseller);
    if (body.isPublished !== undefined) product.isPublished = asBool(body.isPublished);

    let keepImages: { url: string; publicId: string }[] = product.images as never;
    if (body.existingImages !== undefined) {
      try {
        keepImages = JSON.parse(body.existingImages);
      } catch {
        keepImages = [];
      }
      const keepIds = new Set(keepImages.map((i) => i.publicId).filter(Boolean));
      for (const img of product.images) {
        if (img.publicId && !keepIds.has(img.publicId)) {
          try {
            await deleteCloudinaryImage(img.publicId);
          } catch {
            /* ignore */
          }
        }
      }
    }

    const files = (req.files as Express.Multer.File[]) ?? [];
    const uploaded = [];
    for (const file of files) {
      const result = await uploadImageBuffer(file.buffer);
      uploaded.push({ url: result.url, publicId: result.publicId });
    }

    product.images = buildImagesFromPlan(
      body.imagePlan,
      keepImages,
      uploaded,
      body.primaryImageIndex,
    ) as never;
    await product.save();
    res.json({ success: true, product: mapProduct(product) });
  }),
);

router.patch(
  "/:id/stock",
  protect,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const quantity = Number(req.body.stockQuantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      throw new AppError("Invalid stock quantity");
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stockQuantity: quantity, inStock: quantity > 0 },
      { new: true },
    );
    if (!product) throw notFound("Product not found");
    res.json({ success: true, product: mapProduct(product) });
  }),
);

router.delete(
  "/:id",
  protect,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound("Product not found");
    for (const img of product.images) {
      if (img.publicId) {
        try {
          await deleteCloudinaryImage(img.publicId);
        } catch {
          /* ignore */
        }
      }
    }
    await product.deleteOne();
    res.json({ success: true, message: "Product deleted" });
  }),
);

export default router;
