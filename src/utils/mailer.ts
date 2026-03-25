import fs from "fs/promises";
import nodemailer from "nodemailer";
import env from "../config/env";
import AppError from "./AppError";

export type MailAttachment = {
  filename: string;
  contentType?: string;
  path?: string; // for nodemailer
  contentBase64?: string; // for Mailjet
};

type SendMailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
};

const resolveProvider = () => {
  const explicit = env.mail.provider?.toLowerCase();
  if (explicit === "mailjet" || explicit === "nodemailer") return explicit;
  return env.nodeEnv === "production" ? "nodemailer" : "mailjet";
};

export const sendMail = async (input: SendMailInput) => {
  const provider = resolveProvider();

  if (provider === "mailjet") {
    return sendMailjet(input);
  }

  return sendNodemailer(input);
};

const sendNodemailer = async (input: SendMailInput) => {
  if (!env.mail.host || !env.mail.user || !env.mail.pass || !env.mail.from) {
    throw new AppError("SMTP configuration is missing for nodemailer", 500);
  }

  const transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.port === 465,
    auth: {
      user: env.mail.user,
      pass: env.mail.pass,
    },
  });

  await transporter.sendMail({
    from: env.mail.from,
    to: input.to,
    subject: input.subject,
    text: input.text ?? "",
    html: input.html,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      path: a.path,
    })),
  });
};

const sendMailjet = async (input: SendMailInput) => {
  if (!env.mail.mailjetApiKey || !env.mail.mailjetApiSecret || !env.mail.from) {
    throw new AppError("Mailjet configuration is missing", 500);
  }

  const basicAuth = Buffer.from(
    `${env.mail.mailjetApiKey}:${env.mail.mailjetApiSecret}`,
    "utf8",
  ).toString("base64");

  const attachments =
    input.attachments?.length
      ? await Promise.all(
          input.attachments.map(async (a) => {
            let base64Content = a.contentBase64;
            if (!base64Content && a.path) {
              const buf = await fs.readFile(a.path);
              base64Content = buf.toString("base64");
            }

            if (!base64Content) {
              throw new AppError(
                "Mailjet attachments require either contentBase64 or path",
                500,
              );
            }

            return {
              ContentType: a.contentType || "application/octet-stream",
              Filename: a.filename,
              Base64Content: base64Content,
            };
          }),
        )
      : undefined;

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
          To: [{ Email: input.to }],
          Subject: input.subject,
          TextPart: input.text ?? "",
          HTMLPart: input.html,
          Attachments: attachments,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AppError(`Mailjet send failed (${res.status}). ${body}`.trim(), 500);
  }
};

