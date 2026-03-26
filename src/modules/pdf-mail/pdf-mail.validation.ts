import { z } from "zod";

export const generateAndSendPdfSchema = z.object({
  body: z.object({
    html: z
      .string()
      .min(1, "HTML content is required")
      .max(200000, "HTML content is too large"),
    targetEmail: z.string().email("Valid target email is required"),
    subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
    content: z.string().min(1, "Email content is required").max(5000, "Email content is too long"),
  }),
});
