import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, unauthorized } from "../utils/errors.js";
import { signToken } from "../utils/tokens.js";
import { protect, requireAdmin } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  phone?: string;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? "",
  };
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) throw new AppError("Email already registered", 409);

    const user = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      password: body.password,
      phone: body.phone ?? "",
      role: "customer",
    });

    const token = signToken({
      sub: user._id.toString(),
      role: "customer",
      email: user.email,
    });

    res.status(201).json({
      success: true,
      token,
      user: publicUser(user),
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() }).select(
      "+password name email role phone isActive",
    );
    if (!user || !user.isActive) throw unauthorized("Invalid email or password");
    const ok = await user.comparePassword(body.password);
    if (!ok) throw unauthorized("Invalid email or password");

    const token = signToken({
      sub: user._id.toString(),
      role: user.role as "customer" | "admin",
      email: user.email,
    });

    res.json({
      success: true,
      token,
      user: publicUser(user),
    });
  }),
);

/** Admin-only login endpoint — rejects customers */
router.post(
  "/admin/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() }).select(
      "+password name email role phone isActive",
    );
    if (!user || !user.isActive) throw unauthorized("Invalid email or password");
    if (user.role !== "admin") {
      throw unauthorized("This account is not an admin. Use the store login.");
    }
    const ok = await user.comparePassword(body.password);
    if (!ok) throw unauthorized("Invalid email or password");

    const token = signToken({
      sub: user._id.toString(),
      role: "admin",
      email: user.email,
    });

    res.json({
      success: true,
      token,
      user: publicUser(user),
    });
  }),
);

router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id).select("name email role phone addresses wishlist");
    if (!user) throw unauthorized();
    res.json({
      success: true,
      user: {
        ...publicUser(user),
        addresses: user.addresses,
        wishlist: user.wishlist,
      },
    });
  }),
);

router.get(
  "/admin/me",
  protect,
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json({ success: true, user: req.user });
  }),
);

export default router;
