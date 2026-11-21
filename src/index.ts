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

async function main() {
  await connectDb();

  const app = express();

  app.use(
    cors({
      origin: [env.clientUrl, env.dashboardUrl, "http://localhost:3000", "http://localhost:3001"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      message: "Velora API running",
      cloudinary: Boolean(
        env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
      ),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/collections", collectionRoutes);
  app.use("/api/upload", uploadRoutes);

  app.use((_req, _res, next) => next(new AppError("Route not found", 404)));
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});
