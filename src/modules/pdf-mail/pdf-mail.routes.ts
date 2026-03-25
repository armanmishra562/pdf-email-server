import { Router } from "express";
import rateLimit from "express-rate-limit";
import validate from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { generateAndSendPdfSchema } from "./pdf-mail.validation";
import { generateAndSendPdf } from "./pdf-mail.controller";

const pdfMailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many PDF generation requests, try again later",
});

const router = Router();

router.post(
  "/generate-and-send",
  authenticate,
  pdfMailLimiter,
  validate(generateAndSendPdfSchema),
  generateAndSendPdf
);

export default router;
