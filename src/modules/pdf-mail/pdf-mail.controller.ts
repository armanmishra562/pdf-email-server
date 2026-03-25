import { Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiResponse from "../../utils/ApiResponse";
import { AuthRequest } from "../../middlewares/auth.middleware";
import PdfMailService from "./pdf-mail.service";

export const generateAndSendPdf = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.userId) {
      return res.status(401).json(new ApiResponse(false, "Unauthorized"));
    }

    const { html, targetEmail, subject, content } = req.body;

    const result = await PdfMailService.generateAndSendPdf({
      html,
      targetEmail,
      subject,
      content,
      requestedByUserId: req.user.userId,
    });

    return res.status(201).json(
      new ApiResponse(true, "PDF generated and sent successfully", {
        fileName: result.fileName,
        filePath: result.filePath,
        targetEmail: result.targetEmail,
      })
    );
  }
);
