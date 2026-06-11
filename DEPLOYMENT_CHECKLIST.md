# NOSTLABEL — MERN Stack Deployment Checklist

Use this checklist to ensure all environment variables, domains, CORS settings, and integrations are properly configured when deploying the frontend and backend of **NOSTLABEL**.

---

## 1. BACKEND DEPLOYMENT (Render)

### Environment Variables
Configure these variables under the **Environment** tab of the Render Web Service:

| Variable Name | Required Value/Format | Purpose |
|---|---|---|
| `PORT` | `3006` or `10000` (Render default) | Port the server listens on |
| `NODE_ENV` | `production` | Enforces production logging and errors |
| `CLIENT_URL` | `https://nostlabel.com` | Base origin allowed for credentialed CORS queries |
| `MONGODB_URI` | `mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname` | MongoDB connection string (fully encoded password) |
| `JWT_ACCESS_SECRET` | Cryptographically random string (e.g. `openssl rand -hex 32`) | JWT Access Token signing key |
| `JWT_ACCESS_EXPIRY` | `15m` | Lifetime of JWT access token |
| `JWT_REFRESH_SECRET` | Cryptographically random string | JWT Refresh Token signing key |
| `JWT_REFRESH_EXPIRY` | `7d` | Lifetime of JWT refresh token |
| `RAZORPAY_KEY_ID` | Live Razorpay key | ID for payment order creation |
| `RAZORPAY_KEY_SECRET` | Live Razorpay secret | Key secret for payment verification |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification secret | Enforces secure Razorpay webhook events validation |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary name | Media asset bucket identifier |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Credentials for product image uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Credentials for product image uploads |
| `REDIS_URL` | Redis instance URL (optional) | Caching storage URL |
| `RESEND_API_KEY` | Resend API Key | Transactional email delivery API key |
| `EMAIL_FROM` | `noreply@nostlabel.com` (must match verified domain) | Branded sender email |
| `ADMIN_NAME` | Initial administrator name | Seed admin username |
| `ADMIN_EMAIL` | Initial administrator email | Seed admin login |
| `ADMIN_PASSWORD` | Secure administrator password | Seed admin credentials |
| `OTP_EXPIRY_MINUTES` | `5` | Expiry duration for email/password OTPs |
| `OTP_MAX_ATTEMPTS` | `5` | Max incorrect OTP entries allowed |

### Render Configuration
* **Root Directory**: `nostlable-backend` (or `./` if deployed from dedicated repo)
* **Build Command**: `npm install`
* **Start Command**: `npm start`
* **Advanced Settings**:
  * **Redirects/Rewrites**: None needed.
  * **Health Check Path**: `/api-docs` or `/` (checks express server startup).

---

## 2. FRONTEND DEPLOYMENT (Vercel / Netlify / Custom Host)

### Environment Variables
Configure these variables in the frontend host dashboard before triggering the production build:

| Variable Name | Required Value | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://nostlabel-backend.onrender.com/api` | API Base URL pointing to production backend |

### Build Configuration
* **Root Directory**: `nostlabel-frontend`
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Routing Rewrites** (for single page applications):
  * Create `vercel.json` in root if using Vercel to handle router fallbacks:
    ```json
    {
      "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
    }
    ```

---

## 3. CORE INTEGRATIONS SETUP

### MongoDB Atlas Settings
1. **IP Access List**:
   * Add Render outbound IP addresses (or allow `0.0.0.0/0` if Render IPs are dynamic).
2. **Database Access**:
   * Ensure user has readWrite privileges for the target database.

### Custom Domain Configuration (nostlabel.com)
1. **DNS Settings**:
   * Map `A` records to Vercel/frontend IP addresses.
   * Map `CNAME` for `www.nostlabel.com` to target host.
2. **SSL/TLS Certificates**:
   * Verify SSL is active on `https://nostlabel.com` and `https://www.nostlabel.com`.

### Razorpay Webhook Configuration
1. **Webhook URL**:
   * Add a webhook in Razorpay Dashboard pointing to `https://nostlabel-backend.onrender.com/api/payments/webhook`.
2. **Active Events**:
   * Select `payment.captured` and `payment.failed`.
3. **Webhook Secret**:
   * Copy the generated secret and set it as `RAZORPAY_WEBHOOK_SECRET` on Render.

### Resend Email Settings
1. **Domain Verification**:
   * Add and verify your domain (`nostlabel.com`) in the Resend dashboard using the required MX/TXT records.
2. **Sender Domain Matching**:
   * Ensure `EMAIL_FROM` on Render uses the verified domain (e.g. `noreply@nostlabel.com`).
