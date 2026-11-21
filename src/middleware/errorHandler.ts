import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isApp = err instanceof AppError;
  const status = isApp ? err.statusCode : 500;
  const message = isApp
    ? err.message
    : err instanceof Error
      ? err.message
      : "Server error";

  if (!isApp) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(env.nodeEnv === "development" && !isApp && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}
