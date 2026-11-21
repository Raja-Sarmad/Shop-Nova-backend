import { Router } from "express";
import { uploadImageBuffer } from "../config/cloudinary.js";
import { protect, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";

const router = Router();

router.post(
  "/",
  protect,
  requireAdmin,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("No image file provided");
    const folder = typeof req.body.folder === "string" ? req.body.folder : "velora/products";
    const result = await uploadImageBuffer(req.file.buffer, folder);
    res.status(201).json({
      success: true,
      image: { url: result.url, publicId: result.publicId },
    });
  }),
);

router.post(
  "/many",
  protect,
  requireAdmin,
  upload.array("images", 8),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) throw new AppError("No image files provided");
    const images = [];
    for (const file of files) {
      const result = await uploadImageBuffer(file.buffer);
      images.push({ url: result.url, publicId: result.publicId });
    }
    res.status(201).json({ success: true, images });
  }),
);

export default router;
