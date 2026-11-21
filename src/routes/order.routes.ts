import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, notFound } from "../utils/errors.js";
import { optionalAuth, protect, requireAdmin } from "../middleware/auth.js";

const router = Router();

const FREE_SHIPPING = 15000;
const FLAT_SHIPPING = 350;

const placeSchema = z.object({
  email: z.string().email(),
  paymentMethod: z.enum(["cod", "card"]).default("cod"),
  notes: z.string().optional(),
  address: z.object({
    fullName: z.string().min(2),
    line1: z.string().min(3),
    city: z.string().min(2),
    region: z.string().min(2),
    postalCode: z.string().min(3),
    phone: z.string().min(7),
  }),
  items: z
    .array(
      z.object({
        productId: z.string(),
        size: z.string().optional(),
        color: z.string().optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

function orderNumber() {
  return `VL-${Date.now().toString().slice(-8)}`;
}

router.post(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const body = placeSchema.parse(req.body);
    const lineItems = [];
    let subtotal = 0;

    for (const item of body.items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isPublished) {
        throw new AppError(`Product unavailable: ${item.productId}`, 400);
      }
      if (product.stockQuantity < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.name}`, 400);
      }
      const line = {
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url ?? "",
        price: product.price,
        size: item.size ?? "",
        color: item.color ?? "",
        quantity: item.quantity,
      };
      lineItems.push(line);
      subtotal += product.price * item.quantity;
    }

    const shipping = subtotal >= FREE_SHIPPING ? 0 : FLAT_SHIPPING;
    const order = await Order.create({
      orderNumber: orderNumber(),
      user: req.user?.id,
      email: body.email.toLowerCase(),
      items: lineItems,
      subtotal,
      shipping,
      total: subtotal + shipping,
      status: "processing",
      paymentStatus: body.paymentMethod === "cod" ? "pending" : "paid",
      paymentMethod: body.paymentMethod,
      shippingAddress: body.address,
      notes: body.notes ?? "",
    });

    for (const item of body.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: -item.quantity },
      });
      const p = await Product.findById(item.productId);
      if (p) {
        p.inStock = p.stockQuantity > 0;
        await p.save();
      }
    }

    res.status(201).json({ success: true, order });
  }),
);

router.get(
  "/mine",
  protect,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({
      $or: [{ user: req.user!.id }, { email: req.user!.email }],
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, orders });
  }),
);

router.get(
  "/mine/:id",
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({
      _id: req.params.id,
      $or: [{ user: req.user!.id }, { email: req.user!.email }],
    }).lean();
    if (!order) throw notFound("Order not found");
    res.json({ success: true, order });
  }),
);

/** Admin */
router.get(
  "/admin/all",
  protect,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, orders });
  }),
);

router.patch(
  "/admin/:id/status",
  protect,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = z
      .enum(["processing", "shipped", "delivered", "cancelled"])
      .parse(req.body.status);
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!order) throw notFound("Order not found");
    res.json({ success: true, order });
  }),
);

export default router;
