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

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;