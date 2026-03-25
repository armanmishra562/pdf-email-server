import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import nodemailer from "nodemailer";
import puppeteer from "puppeteer";
import AppError from "../../utils/AppError";
import env from "../../config/env";

interface GenerateAndSendPdfInput {
  html: string;
  targetEmail: string;
  subject: string;
  content: string;
  requestedByUserId: string;
}

class PdfMailService {
  private async createPdfFromHtml(html: string, outputPath: string): Promise<void> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: env.puppeteer.executablePath,
      });
    } catch (err: any) {
      throw new AppError(
        [
          "Puppeteer could not launch Chrome/Chromium.",
          "On Windows, install the browser once:",
          "`npx puppeteer browsers install chrome`",
          "Or set `PUPPETEER_EXECUTABLE_PATH` to your Chrome/Chromium executable.",
          err?.message ? `Details: ${err.message}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        500,
      );
    }

    try {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);

      page.on("request", (request) => {
        const requestUrl = request.url();
        if (
          requestUrl.startsWith("data:") ||
          requestUrl.startsWith("about:blank") ||
          requestUrl.startsWith("blob:")
        ) {
          request.continue();
          return;
        }
        request.abort();
      });

      await page.setContent(html, { waitUntil: "domcontentloaded" });
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
      });
    } finally {
      await browser.close();
    }
  }

  private getNodemailerTransporter() {
    if (!env.mail.host || !env.mail.user || !env.mail.pass || !env.mail.from) {
      throw new AppError("SMTP configuration is missing for nodemailer", 500);
    }

    return nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      auth: {
        user: env.mail.user,
        pass: env.mail.pass,
      },
    });
  }

  private async sendMailjetMail(params: {
    to: string;
    subject: string;
    text: string;
    fileName: string;
    pdfPath: string;
  }) {
    if (
      !env.mail.mailjetApiKey ||
      !env.mail.mailjetApiSecret ||
      !env.mail.from
    ) {
      throw new AppError("Mailjet configuration is missing", 500);
    }

    const pdfBuffer = await fs.readFile(params.pdfPath);
    const base64 = pdfBuffer.toString("base64");

    const basicAuth = Buffer.from(
      `${env.mail.mailjetApiKey}:${env.mail.mailjetApiSecret}`,
      "utf8",
    ).toString("base64");

    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: env.mail.from },
            To: [{ Email: params.to }],
            Subject: params.subject,
            TextPart: params.text,
            Attachments: [
              {
                ContentType: "application/pdf",
                Filename: params.fileName,
                Base64Content: base64,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AppError(
        `Mailjet send failed (${res.status}). ${body}`.trim(),
        500,
      );
    }
  }

  async generateAndSendPdf(input: GenerateAndSendPdfInput) {
    const uploadsDir = path.resolve(process.cwd(), "uploads", "pdfs");
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `pdf-${Date.now()}-${crypto.randomUUID()}.pdf`;
    const pdfPath = path.join(uploadsDir, fileName);

    await this.createPdfFromHtml(input.html, pdfPath);

    const provider =
      (env.mail.provider ||
        (env.nodeEnv === "production" ? "nodemailer" : "mailjet"))?.toLowerCase();

    if (provider === "mailjet") {
      await this.sendMailjetMail({
        to: input.targetEmail,
        subject: input.subject,
        text: input.content,
        fileName,
        pdfPath,
      });
    } else {
      const transporter = this.getNodemailerTransporter();
      await transporter.sendMail({
        from: env.mail.from,
        to: input.targetEmail,
        subject: input.subject,
        text: input.content,
        attachments: [
          {
            filename: fileName,
            path: pdfPath,
            contentType: "application/pdf",
          },
        ],
      });
    }

    return {
      fileName,
      filePath: pdfPath,
      targetEmail: input.targetEmail,
      requestedByUserId: input.requestedByUserId,
    };
  }
}

export default new PdfMailService();
