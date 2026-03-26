import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("ERROR 💥", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Prisma Error (duplicate key)
  if (err.code === "P2002") {
    statusCode = 400;
    message = "Duplicate field value";
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Body parser JSON error (common when raw multiline HTML is sent as JSON).
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message =
      "Invalid JSON payload. For raw multiline HTML, use x-www-form-urlencoded with an `html` field (or send properly escaped JSON string).";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;