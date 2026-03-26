import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from "express-rate-limit";

import errorMiddleware from './middlewares/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from "./modules/user/user.routes";
import pdfMailRoutes from "./modules/pdf-mail/pdf-mail.routes";

const app = express();

//  trust proxy (important for deployment)
app.set("trust proxy", 1);

//  security headers
app.use(helmet());

//  CORS config
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

//  body parser with limit
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

//  logging
app.use(morgan('dev'));

//  rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later",
});

app.use(limiter);

//  health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

//  routes
app.use('/api/v1/auth', authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/pdf-mail", pdfMailRoutes);

//  error handler (always last)
app.use(errorMiddleware);

export default app;