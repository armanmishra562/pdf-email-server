const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  publicUrl:
    process.env.PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 5000}`,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,

    accessExpiry: process.env.JWT_ACCESS_EXPIRES as string,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRES as string,
  },

  databaseUrl: process.env.DATABASE_URL as string,
  mail: {
    provider: process.env.MAIL_PROVIDER as string,
    host: process.env.SMTP_HOST as string,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER as string,
    pass: process.env.SMTP_PASS as string,
    // Used as sender for both providers.
    from: (process.env.MAIL_FROM || process.env.SMTP_FROM) as string,
    mailjetApiKey: process.env.MAILJET_API_KEY as string,
    mailjetApiSecret: process.env.MAILJET_API_SECRET as string,
  },

  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH as string | undefined,
  },
};

export default env;