# Secure Web Server - HTML to PDF & Email Delivery

## Overview
This project is a secure Node.js + Express web server that provides:

1. **Authentication & authorization** (JWT access + refresh tokens, password hashing, email verification, password reset, RBAC).
2. A **protected PDF generation + email delivery** endpoint that:
   - Accepts an HTML snippet and email metadata from a logged-in user.
   - Converts HTML -> **PDF** using **Puppeteer**.
   - Saves the PDF **locally** on the server.
   - Sends the PDF as an **email attachment**.

The server is organized into modules (auth, users, pdf-mail) and uses centralized error handling.

## Features

### Security & request hardening
- `helmet` security headers
- `cors` configured for a dev origin (`http://localhost:3000`) with credentials support
- JSON request size limit (`10kb`)
- Global rate limiting (`express-rate-limit`)
- Per-route rate limiting for authentication endpoints and PDF generation

### Authentication
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/verify-email?token=...`
- `POST /api/v1/auth/login`
- Refresh token flow (`POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`)
- Password reset flow (`POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`)
- Passwords hashed with `bcrypt`
- Refresh tokens stored **hashed** in Postgres (rotation on refresh)

### RBAC
- `Role` enum: `USER`, `ADMIN`
- `authorize(Role...)` middleware to enforce role-based access to protected endpoints

### HTML -> PDF -> Email
- `POST /api/v1/pdf-mail/generate-and-send` (protected)
- HTML -> PDF conversion via Puppeteer
- PDF stored under: `uploads/pdfs/`
- Email delivery:
  - **Mailjet** in development
  - **Nodemailer (SMTP)** in production

## Tech Stack
- Node.js + Express
- TypeScript
- Prisma ORM + PostgreSQL
- JWT (`jsonwebtoken`)
- Nodemailer / Mailjet
- Puppeteer (HTML -> PDF)
- Zod (request validation)

## Prerequisites
- Node.js installed
- A PostgreSQL database accessible via `DATABASE_URL`
- Puppeteer/Chrome available (see Troubleshooting)

## Getting Started

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment variables
Create a `.env` file in the project root (values are placeholders below).

```env
PORT=8000
NODE_ENV=development

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require"

# JWT
JWT_ACCESS_SECRET="..."
JWT_REFRESH_SECRET="..."
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Email (sender)
MAIL_FROM="you@example.com"

# Dev email provider: Mailjet
MAILJET_API_KEY="..."
MAILJET_API_SECRET="..."

# Prod email provider: Nodemailer (SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASS="..."

# Optional: generate absolute links in emails
PUBLIC_URL="http://localhost:8000"

# Optional: point Puppeteer at an existing Chrome/Chromium executable
PUPPETEER_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

# Optional: force mail provider explicitly
# MAIL_PROVIDER="mailjet" | "nodemailer"
```

### 3) Create database tables
```bash
npx prisma generate
npx prisma migrate dev
```

> The Prisma schema defines `User` and `RefreshToken`.

### 4) Run the server
Development:
```bash
npm run dev
```

Production build + start:
```bash
npm run build
npm start
```

### 5) Health check
```http
GET /health
```

## API Documentation

### Base URL
- `http://localhost:8000/api/v1` (default from `.env`)

### Authentication Routes

#### Register
`POST /api/v1/auth/register`

**Headers**
- `Content-Type: application/json`

**Body**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Behavior**
- Creates the user.
- Generates `verificationToken`.
- Stores verification token + expiry in the database.
- Sends an email containing a clickable verification link.

#### Verify Email
`GET /api/v1/auth/verify-email?token=...`

**Behavior**
- Validates token and expiry.
- Marks user as verified and clears verification fields.

#### Login
`POST /api/v1/auth/login`

**Body**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response**
- `accessToken` (Bearer)
- `refreshToken` (used for refresh/logout)

> Login requires `isVerified=true`.

#### Refresh Token
`POST /api/v1/auth/refresh`

**Body**
```json
{
  "refreshToken": "..."
}
```

**Behavior**
- Validates refresh token.
- Rotates refresh tokens (deletes old hashed token, stores new hashed token).

#### Logout
`POST /api/v1/auth/logout`

**Body**
```json
{
  "refreshToken": "..."
}
```

**Behavior**
- Deletes the matching refresh token from the database.

#### Forgot Password
`POST /api/v1/auth/forgot-password`

**Body**
```json
{
  "email": "user@example.com"
}
```

**Behavior**
- Generates `resetToken` with a short expiry.
- Saves token + expiry in DB.
- Sends an email with reset instructions.

#### Reset Password
`POST /api/v1/auth/reset-password`

**Body**
```json
{
  "token": "resetTokenFromEmailOrResponse",
  "password": "NewPassword123!"
}
```

**Behavior**
- Validates reset token and expiry.
- Updates password.
- Invalidates (deletes) all refresh tokens for the user.

### User Routes (Protected)

These routes require authentication via `Authorization: Bearer <accessToken>` and enforce roles via RBAC.

#### Profile (USER + ADMIN)
`GET /api/v1/users/profile`

#### All users (ADMIN only)
`GET /api/v1/users/all-users`

#### Delete user (ADMIN only)
`DELETE /api/v1/users/:id`

### PDF Mail Route (Protected)

#### Generate PDF + Send Email
`POST /api/v1/pdf-mail/generate-and-send`

**Headers**
- `Content-Type: application/json`
- `Authorization: Bearer <accessToken>`

**Body**
```json
{
  "html": "<html><body><h1>Hello</h1></body></html>",
  "targetEmail": "recipient@example.com",
  "subject": "Your PDF document",
  "content": "Email body text"
}
```

**Behavior**
- Converts the `html` to a PDF using Puppeteer.
- Saves the file to `uploads/pdfs/` on the server.
- Sends an email with the PDF attached.

**Response (shape)**
```json
{
  "success": true,
  "message": "PDF generated and sent successfully",
  "data": {
    "fileName": "pdf-....pdf",
    "filePath": ".../uploads/pdfs/pdf-....pdf",
    "targetEmail": "recipient@example.com"
  }
}
```

## Mail Provider Behavior (Dev vs Prod)

The server selects the mail provider based on environment:
- **Development** (`NODE_ENV != "production"`): **Mailjet**
- **Production** (`NODE_ENV == "production"`): **Nodemailer (SMTP)**
- You may override with `MAIL_PROVIDER=mailjet` or `MAIL_PROVIDER=nodemailer`.

### Attachments
- Mailjet: uses `Base64Content` for the PDF attachment.
- Nodemailer: uses `path` to attach the locally saved PDF file.

## Puppeteer / Chrome Troubleshooting

If PDF generation fails with an error like:
`Could not find Chrome (ver. ...)`

Run this once to download the browser that Puppeteer expects:
```bash
npx puppeteer browsers install chrome
```

Alternatively, set:
`PUPPETEER_EXECUTABLE_PATH` to your installed Chrome/Chromium executable.

## Postman Collection

A ready-to-run Postman collection is included:
- `Secure-Web-Server-HTML-to-PDF.postman_collection.json`

It executes in order:
1) Register
2) Verify Email
3) Login
4) Generate PDF + Send Email

## Notes & Limitations
- The PDF endpoint is protected and uses RBAC-authenticated JWT access tokens.
- Generated PDFs are saved locally on the server (`uploads/pdfs/`).
- The HTML->PDF step blocks non-safe external resource loading to reduce risk.

