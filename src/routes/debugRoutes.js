import { Router } from "express";
import { Resend } from "resend";
import { sendEmail } from "../services/emailService.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyJWT, isAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

// Secure all debug routes
router.use(verifyJWT, isAdmin);

// GET /api/debug/email-health
router.get("/email-health", asyncHandler(async (req, res) => {
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const domainDetected = emailFrom.split("@")[1] || "unknown";
  const isMock = !apiKey || apiKey === "mock";
  
  let resendReachable = false;
  let resendDomainStatus = "unknown";
  let errorDetails = null;
  let domainList = [];

  if (!isMock) {
    try {
      const resend = new Resend(apiKey);
      const response = await resend.domains.list();
      
      if (response.error) {
        errorDetails = response.error;
        resendDomainStatus = "api_error";
      } else if (response.data && response.data.data) {
        resendReachable = true;
        domainList = response.data.data.map(d => ({
          name: d.name,
          status: d.status,
          id: d.id
        }));
        
        const matchedDomain = response.data.data.find(d => d.name === domainDetected);
        if (matchedDomain) {
          resendDomainStatus = matchedDomain.status; // e.g. "verified"
        } else {
          resendDomainStatus = "not_found";
        }
      }
    } catch (err) {
      errorDetails = err.message;
      resendDomainStatus = "connection_failed";
    }
  } else {
    resendReachable = false;
    resendDomainStatus = "mock_mode";
  }

  return res.status(200).json(new ApiResponse(200, {
    apiKeyLoaded: !!apiKey && apiKey !== "mock",
    emailFrom,
    domainDetected,
    environment: process.env.NODE_ENV || "development",
    resendReachable,
    resendDomainStatus,
    domainList,
    errorDetails
  }, "Email service health check status retrieved"));
}));

// POST /api/debug/test-email
router.post("/test-email", asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ApiError(400, "Recipient email is required");
  }

  const subject = "TEST EMAIL - Nostlabel Diagnostic Service";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Resend Diagnostic Test</title>
    </head>
    <body style="font-family: sans-serif; padding: 20px; background-color: #f4f4f5;">
      <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 6px; border: 1px solid #e4e4e7;">
        <h2 style="color: #18181b; margin-top: 0;">Nostlabel Email Delivery Diagnostic</h2>
        <p style="color: #52525b; line-height: 1.5;">This email verifies that the Resend integration for <strong>Nostlabel</strong> is functional.</p>
        <div style="background-color: #f4f4f5; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 20px 0;">
          Sender: ${process.env.EMAIL_FROM || "onboarding@resend.dev"}<br/>
          Recipient: ${email}<br/>
          Timestamp: ${new Date().toISOString()}
        </div>
        <p style="color: #a1a1aa; font-size: 11px; margin-bottom: 0;">Secure check completed.</p>
      </div>
    </body>
    </html>
  `;

  const result = await sendEmail({
    to: email,
    subject,
    html,
    text: `Nostlabel Test Email. Sender: ${process.env.EMAIL_FROM}. Recipient: ${email}.`
  });

  if (!result.success) {
    return res.status(500).json(new ApiResponse(500, {
      success: false,
      sender: process.env.EMAIL_FROM || "onboarding@resend.dev",
      recipient: email,
      error: result.error,
      fullError: result.details || null
    }, "Test email delivery failed"));
  }

  return res.status(200).json(new ApiResponse(200, {
    success: true,
    messageId: result.id || "mock_id",
    sender: process.env.EMAIL_FROM || "onboarding@resend.dev",
    recipient: email
  }, "Test email dispatched successfully"));
}));

export default router;
