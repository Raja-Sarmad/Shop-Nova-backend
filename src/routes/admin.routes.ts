import { Router } from "express";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { Collection } from "../models/Collection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protect, requireAdmin } from "../middleware/auth.js";
import { mapProduct } from "../utils/mapProduct.js";

const router = Router();

router.use(protect, requireAdmin);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [
      productCount,
      customerCount,
      orderCount,
      revenueAgg,
      lowStock,
      recentOrders,
      products,
    ] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Product.find({ stockQuantity: { $lte: 5 } })
        .sort({ stockQuantity: 1 })
        .limit(8)
        .lean(),
      Order.find().sort({ createdAt: -1 }).limit(6).lean(),
      Product.find().sort({ createdAt: -1 }).limit(6).lean(),
    ]);

    res.json({
      success: true,
      stats: {
        products: productCount,
        customers: customerCount,
        orders: orderCount,
        revenue: revenueAgg[0]?.total ?? 0,
        lowStockCount: await Product.countDocuments({ stockQuantity: { $lte: 5 } }),
      },
      lowStock: lowStock.map((p) => mapProduct(p as never)),
      recentOrders,
      recentProducts: products.map((p) => mapProduct(p as never)),
    });
  }),
);

router.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    const customers = await User.find({ role: "customer" })
      .select("name email phone createdAt isActive")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, customers });
  }),
);

router.get(
  "/collections",
  asyncHandler(async (_req, res) => {
    const collections = await Collection.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, collections });
  }),
);

export default router;
