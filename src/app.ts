import express from "express";
import cors from "cors";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import collectionRoutes from "./routes/collection.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { AppError } from "./utils/errors.js";

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;

  const allowed = new Set([
    env.clientUrl,
    env.dashboardUrl,
    "http://localhost:3000",
    "http://localhost:3001",
  ]);

  if (allowed.has(origin)) return true;
  return /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin);
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "Shop Nova API",
      health: "/api/health",
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      message: "Shop Nova API running",
      cloudinary: Boolean(
        env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
      ),
    });
  });

  app.use(async (_req, _res, next) => {
    try {
      await connectDb();
      next();
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/collections", collectionRoutes);
  app.use("/api/upload", uploadRoutes);

  app.use((_req, _res, next) => next(new AppError("Route not found", 404)));
  app.use(errorHandler);

  return app;
}
