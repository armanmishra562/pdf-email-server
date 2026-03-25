import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import AppError from "../utils/AppError";
import { Role } from "../types/role";

export const authorize =
  (...roles: Role[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Forbidden: Requires role ${roles.join(", ")}`,
        403
      );
    }

    next();
  };