import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import AppError from "../utils/AppError";

const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return next(new AppError(errorMessage, 400));
    }

    next();
  };

export default validate;