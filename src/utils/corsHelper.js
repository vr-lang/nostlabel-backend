export const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://nostlabel.com",
  "https://www.nostlabel.com",
];

/**
 * Validates whether an incoming HTTP request origin is allowed by CORS policy.
 * Supports localhost on any port and Vercel preview/branch deployments.
 * @param {string} origin - The incoming Origin header value.
 * @returns {boolean} True if the origin is authorized.
 */
export const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-browser requests (like server-to-server or Postman)

  // 1. Exact match in allowed origins list
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // 2. Allow localhost or 127.0.0.1 on any port for local development
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return true;
  }

  // 3. Allow Vercel preview/staging deployment domains
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
    return true;
  }

  return false;
};
