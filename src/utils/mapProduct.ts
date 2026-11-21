import type { ProductDoc } from "../models/Product.js";

export function mapProduct(doc: ProductDoc | Record<string, unknown>) {
  const p = doc as ProductDoc & { _id: { toString(): string }; createdAt?: Date };
  return {
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    category: p.category,
    collection: p.collectionSlug,
    images: (p.images ?? []).map((img) =>
      typeof img === "string" ? img : img.url,
    ),
    imageMeta: p.images ?? [],
    colors: p.colors ?? [],
    sizes: p.sizes ?? [],
    tags: p.tags ?? [],
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    stockQuantity: p.stockQuantity ?? 0,
    inStock: Boolean(p.inStock),
    isNew: Boolean(p.isNew),
    isBestseller: Boolean(p.isBestseller),
    isPublished: p.isPublished !== false,
    fabric: p.fabric,
    care: p.care ?? [],
    details: p.details ?? [],
    createdAt:
      p.createdAt instanceof Date
        ? p.createdAt.toISOString().slice(0, 10)
        : String(p.createdAt ?? ""),
  };
}
