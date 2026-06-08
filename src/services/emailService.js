import { Resend } from "resend";
import crypto from "crypto";
import OTP from "../models/OTP.js";

let resendClientInstance = null;

const getResendClient = () => {
  if (resendClientInstance) return resendClientInstance;
  const apiKey = process.env.RESEND_API_KEY;
  const isMock = !apiKey || apiKey === "mock";
  if (!isMock) {
    resendClientInstance = new Resend(apiKey);
  }
  return resendClientInstance;
};

/**
 * Standardized email sender using Resend API (with console fallback in development mock mode)
 * @param {object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.html - HTML content
 * @param {string} [params.text] - Plain text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const isMock = !apiKey || apiKey === "mock";
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  
  try {
    if (isMock) {
      console.log("\n---------------- MOCK RESEND EMAIL SENT ----------------");
      console.log(`From: ${from}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (text) {
        console.log(`Text Body: ${text}`);
      }
      if (html) {
        console.log("--- HTML Template Body ---");
        console.log(html.trim());
      }
      console.log("---------------------------------------------------------\n");
      return { success: true, isMock: true };
    }

    const resend = getResendClient();
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (response.error) {
      console.error("❌ Resend API Error:", {
        message: response.error.message,
        name: response.error.name,
        statusCode: response.error.statusCode || response.error.status || 403,
        response: response.error.response || response.error
      });
      return { 
        success: false, 
        error: response.error.message || "Resend email delivery failed", 
        details: response.error 
      };
    }

    console.log(`✓ Email sent successfully via Resend. ID: ${response.data.id}`);
    return { success: true, id: response.data.id };
  } catch (error) {
    console.error("❌ Resend Service Runtime/Network Error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      statusCode: error.statusCode || error.status || 500,
      response: error.response || null
    });
    return { success: false, error: error.message };
  }
};

/**
 * HTML Styling helper for uniform premium branding
 */
const getCommonStyles = () => `
  body {
    margin: 0;
    padding: 0;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: #f4f4f5;
    color: #18181b;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border: 1px solid #e4e4e7;
  }
  .header {
    background-color: #18181b;
    color: #ffffff;
    padding: 30px 20px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .content {
    padding: 40px 30px;
    line-height: 1.6;
  }
  .content p {
    margin: 0 0 20px 0;
    color: #52525b;
    font-size: 16px;
  }
  .btn {
    display: inline-block;
    padding: 12px 28px;
    background-color: #18181b;
    color: #ffffff !important;
    text-decoration: none;
    font-weight: 600;
    border-radius: 6px;
    margin: 20px 0;
  }
  .footer {
    background-color: #fafafa;
    padding: 20px;
    text-align: center;
    font-size: 12px;
    color: #a1a1aa;
    border-top: 1px solid #e4e4e7;
  }
`;

/**
 * 1. Dispatches a stylized brand OTP email to the user.
 */
const sendEmailOTP = async (email, otp) => {
  const subject = "Verify Your Email - Nostlabel";
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        .otp-code {
          display: inline-block;
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 0.25em;
          color: #18181b;
          background-color: #f4f4f5;
          padding: 15px 30px;
          border-radius: 6px;
          margin: 20px auto;
          text-align: center;
          border: 1px solid #e4e4e7;
        }
        .note {
          font-size: 14px;
          color: #a1a1aa;
          margin-top: 30px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nostlabel</h1>
        </div>
        <div class="content" style="text-align: center;">
          <p>Thank you for choosing Nostlabel. To complete your registration, please verify your email address using the secure code below.</p>
          <div class="otp-code">${otp}</div>
          <p>This verification code is valid for <strong>5 minutes</strong>. For security reasons, please do not share this code with anyone.</p>
          <p class="note">If you did not request this email, you can safely ignore it.</p>
        </div>
        <div class="footer">
          &copy; 2026 Nostlabel. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, text: `Welcome to Nostlabel! Your email verification OTP is: ${otp}. Valid for 5 minutes.` });
};

/**
 * 2. Dispatches a password reset OTP email.
 */
const sendPasswordResetOTPEmail = async (email, otp) => {
  const subject = "Reset Your Password - Nostlabel";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        .otp-code {
          display: inline-block;
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 0.25em;
          color: #18181b;
          background-color: #f4f4f5;
          padding: 15px 30px;
          border-radius: 6px;
          margin: 20px auto;
          text-align: center;
          border: 1px solid #e4e4e7;
        }
        .note {
          font-size: 14px;
          color: #a1a1aa;
          margin-top: 30px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nostlabel</h1>
        </div>
        <div class="content" style="text-align: center;">
          <p>Hello,</p>
          <p>We received a request to reset your password. Your verification code is:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in <strong>10 minutes</strong>. For security reasons, please do not share this code with anyone.</p>
          <p class="note">If you did not request this change, please ignore this email.</p>
        </div>
        <div class="footer">
          &copy; 2026 Nostlabel. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, text: `Hello, we received a request to reset your password. Your verification code is: ${otp}. This code will expire in 10 minutes.` });
};

/**
 * 3. Dispatches a welcome email for newly registered customers.
 */
const sendWelcomeEmail = async (email, name) => {
  const subject = "Welcome to Nostlabel!";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nostlabel</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Welcome to <strong>Nostlabel</strong>! We are absolutely thrilled to have you join our community of fashion-forward individuals.</p>
          <p>Nostlabel represents premium, timeless designs crafted with care. To welcome you, we are currently offering <strong>20% OFF</strong> your first order. Simply use the coupon code <strong>LAUNCH20</strong> at checkout!</p>
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || "http://localhost:3000"}" class="btn">Explore Collections</a>
          </div>
          <p>If you have any questions or feedback, feel free to reply to this email. Our customer support team is always here to help.</p>
          <p>Best regards,<br>The Nostlabel Team</p>
        </div>
        <div class="footer">
          &copy; 2026 Nostlabel. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, text: `Hi ${name}, welcome to Nostlabel clothing! Use LAUNCH20 to get 20% off your first purchase.` });
};

/**
 * 4. Dispatches an order confirmation receipt email.
 */
const sendOrderConfirmationEmail = async (email, order) => {
  const subject = "Your NOSTLABEL Order Has Been Received";

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px;">
        <strong>${item.name}</strong><br>
        <span style="color: #71717a; font-size: 12px;">Size: ${item.size} | Color: ${item.color}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; text-align: right;">₹${item.price.toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        .card {
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          padding: 20px;
          background-color: #fafafa;
          margin-bottom: 20px;
        }
        .card-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f4f4f5;
          text-align: left;
          padding: 12px;
          font-size: 12px;
          text-transform: uppercase;
          color: #71717a;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nostlabel</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for your purchase! We have received your order and are currently preparing it. Standard order processing takes <strong>1-2 business days</strong> before dispatch. Once shipped, you will receive an automated tracking notification email. Your order number is <strong>#${order.orderNumber}</strong>.</p>
          
          <div class="card" style="margin-bottom: 10px; padding: 15px; background: #fafafa; border: 1px solid #e4e4e7;">
            <p style="margin: 0; font-size: 13px; color: #18181b;">
              Order Number: <strong>#${order.orderNumber}</strong><br>
              Order Date: <strong>${new Date(order.createdAt || Date.now()).toLocaleDateString()}</strong><br>
              Order Status: <strong>${order.orderStatus}</strong>
            </p>
          </div>

          <div class="card">
            <div class="card-title">Order Items</div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: right; line-height: 1.8; font-size: 14px;">
              Subtotal: <strong>₹${order.subtotal.toFixed(2)}</strong><br>
              Discount: <strong style="color: #10b981;">-₹${order.discount.toFixed(2)}</strong><br>
              Shipping: <strong>₹${order.shippingCharge.toFixed(2)}</strong><br>
              Total: <strong style="font-size: 18px;">₹${order.totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Shipping Address</div>
            <p style="margin: 0; font-size: 14px; color: #18181b;">
              <strong>${order.shippingAddress.fullName}</strong><br>
              ${order.shippingAddress.addressLine1}<br>
              ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + "<br>" : ""}
              ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}<br>
              Phone: ${order.shippingAddress.phone}
            </p>
          </div>
        </div>
        <div class="footer">
          &copy; 2026 Nostlabel. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, text: `Thank you for your purchase! Order #${order.orderNumber} of amount ₹${order.totalAmount} has been received.` });
};

/**
 * 5. Dispatches an order status update email.
 */
const sendOrderStatusUpdateEmail = async (email, order) => {
  const subject = `Order Status Update: #${order.orderNumber} is now ${order.orderStatus} - Nostlabel`;

  const statusMapping = {
    PENDING: "Order Placed",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    PACKED: "Packed",
    SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled"
  };

  const currentStatusLabel = statusMapping[order.orderStatus] || order.orderStatus;

  const timelineSteps = [
    { key: "PENDING", label: "Placed" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PACKED", label: "Packed" },
    { key: "SHIPPED", label: "Shipped" },
    { key: "DELIVERED", label: "Delivered" }
  ];

  let activeIndex = timelineSteps.findIndex(step => step.key === order.orderStatus);
  if (order.orderStatus === "PROCESSING") activeIndex = 2;
  if (order.orderStatus === "OUT_FOR_DELIVERY") activeIndex = 3;

  const timelineHtml = timelineSteps.map((step, idx) => {
    const isCompleted = idx <= activeIndex;
    const isCurrent = idx === activeIndex;
    const color = isCurrent ? "#b89359" : (isCompleted ? "#18181b" : "#a1a1aa");
    const weight = isCurrent || isCompleted ? "bold" : "normal";
    return `
      <span style="display: inline-block; margin: 0 10px; font-size: 11px; font-weight: ${weight}; color: ${color}; text-transform: uppercase;">
        ${step.label} ${isCurrent ? "●" : ""}
      </span>
    `;
  }).join("<span style='color: #e4e4e7;'>&rarr;</span>");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        .status-container {
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          padding: 30px 20px;
          background-color: #fafafa;
          text-align: center;
          margin-bottom: 25px;
        }
        .status-header {
          font-size: 11px;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          letter-spacing: 0.2em;
          color: #a1a1aa;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .status-value {
          font-size: 24px;
          font-weight: 700;
          color: #18181b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
        }
        .timeline {
          padding-top: 15px;
          border-top: 1px solid #e4e4e7;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nostlabel</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your order status has been updated. Below are the current tracking details for your order <strong>#${order.orderNumber}</strong>.</p>
          
          <div class="status-container">
            <div class="status-header">CURRENT ORDER STATUS</div>
            <div class="status-value">${currentStatusLabel}</div>
            
            ${order.orderStatus !== "CANCELLED" ? `
              <div class="timeline">
                ${timelineHtml}
              </div>
            ` : ""}
          </div>

          <p style="font-size: 14px; color: #52525b; line-height: 1.6;">
            You can track your order in real-time or request updates by visiting your account dashboard.
            If you have any questions or require immediate support, please reach out to us at <a href="mailto:support@nostlabel.com" style="color: #b89359; text-decoration: none;">support@nostlabel.com</a>.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 Nostlabel. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ 
    to: email, 
    subject, 
    html, 
    text: `Your order #${order.orderNumber} status has been updated to: ${currentStatusLabel}. Support email: support@nostlabel.com` 
  });
};

/**
 * Checks database record, increments attempts, and marks OTP verified if valid.
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<{success: boolean, status?: number, message?: string}>}
 */
const verifyEmailOTP = async (email, otp) => {
  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord) {
    return { success: false, status: 404, message: "No OTP request found for this email address" };
  }

  if (otpRecord.expiresAt < new Date()) {
    return { success: false, status: 400, message: "OTP has expired. Please request a new OTP." };
  }

  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5;
  if (otpRecord.attempts >= maxAttempts) {
    return { success: false, status: 400, message: "Maximum OTP verification attempts exceeded. Please request a new OTP." };
  }

  otpRecord.attempts += 1;

  const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
  if (otpRecord.otpHash !== inputHash) {
    await otpRecord.save();
    const attemptsRemaining = maxAttempts - otpRecord.attempts;
    return {
      success: false,
      status: 400,
      message: `Invalid OTP. Verification attempts remaining: ${attemptsRemaining}`,
    };
  }

  otpRecord.verified = true;
  otpRecord.verifiedAt = new Date();
  otpRecord.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins to submit signup
  await otpRecord.save();

  return { success: true };
};

const sendExchangeStatusEmail = async (email, exchange, order, product) => {
  const statusMapping = {
    EXCHANGE_REQUESTED: "Exchange Requested",
    EXCHANGE_APPROVED: "Exchange Approved",
    EXCHANGE_REJECTED: "Exchange Rejected",
    PICKUP_SCHEDULED: "Pickup Scheduled",
    PRODUCT_RECEIVED: "Product Received",
    REPLACEMENT_PROCESSING: "Replacement Processing",
    REPLACEMENT_SHIPPED: "Replacement Shipped",
    DELIVERED: "Exchange Delivered"
  };

  const currentStatusLabel = statusMapping[exchange.status] || exchange.status;
  const subject = `[NOSTLABEL] Size Exchange Status: ${currentStatusLabel} // #${exchange.exchangeNumber}`;

  const timelineSteps = [
    { key: "EXCHANGE_REQUESTED", label: "Requested" },
    { key: "EXCHANGE_APPROVED", label: "Approved" },
    { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled" },
    { key: "PRODUCT_RECEIVED", label: "Product Received" },
    { key: "REPLACEMENT_PROCESSING", label: "Processing" },
    { key: "REPLACEMENT_SHIPPED", label: "Shipped" },
    { key: "DELIVERED", label: "Delivered" }
  ];

  let activeIndex = timelineSteps.findIndex(step => step.key === exchange.status);

  const timelineHtml = timelineSteps.map((step, idx) => {
    const isCompleted = idx <= activeIndex;
    const isCurrent = idx === activeIndex;
    const color = isCurrent ? "#b89359" : (isCompleted ? "#18181b" : "#a1a1aa");
    const weight = isCurrent || isCompleted ? "bold" : "normal";
    return `
      <span style="display: inline-block; margin: 0 10px; font-size: 11px; font-weight: ${weight}; color: ${color}; text-transform: uppercase;">
        ${step.label} ${isCurrent ? "●" : ""}
      </span>
    `;
  }).join("<span style='color: #e4e4e7;'>&rarr;</span>");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        .status-container {
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          padding: 30px 20px;
          background-color: #fafafa;
          text-align: center;
          margin-bottom: 25px;
        }
        .status-header {
          font-size: 11px;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          letter-spacing: 0.2em;
          color: #a1a1aa;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .status-value {
          font-size: 24px;
          font-weight: 700;
          color: #18181b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
        }
        .timeline {
          padding-top: 15px;
          border-top: 1px solid #e4e4e7;
          text-align: center;
        }
        .details-box {
          border: 1px solid #e4e4e7;
          background-color: #ffffff;
          padding: 15px;
          margin-bottom: 20px;
          font-family: monospace;
          font-size: 12px;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nostlabel</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your size exchange status has been updated. Below are the details for your exchange request <strong>#${exchange.exchangeNumber}</strong> corresponding to order <strong>#${order.orderNumber}</strong>.</p>
          
          <div class="status-container">
            <div class="status-header">CURRENT EXCHANGE STATUS</div>
            <div class="status-value">${currentStatusLabel}</div>
            
            ${exchange.status !== "EXCHANGE_REJECTED" ? `
              <div class="timeline">
                ${timelineHtml}
              </div>
            ` : ""}
          </div>

          <div class="details-box">
            <strong>PRODUCT:</strong> ${product.name}<br>
            <strong>CURRENT SIZE:</strong> ${exchange.currentSize}<br>
            <strong>REQUESTED SIZE:</strong> ${exchange.requestedSize}<br>
            <strong>REASON:</strong> ${exchange.reason}<br>
            ${exchange.notes ? `<strong>CUSTOMER NOTES:</strong> ${exchange.notes}<br>` : ""}
            ${exchange.adminFeedback ? `<strong>ADMIN UPDATE:</strong> ${exchange.adminFeedback}<br>` : ""}
          </div>

          <p style="font-size: 14px; color: #52525b; line-height: 1.6;">
            If you have any questions or require immediate support, please reach out to us at <a href="mailto:support@nostlabel.com" style="color: #b89359; text-decoration: none;">support@nostlabel.com</a>.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 Nostlabel. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ 
    to: email, 
    subject, 
    html, 
    text: `Your exchange request #${exchange.exchangeNumber} status has been updated to: ${currentStatusLabel}. Support email: support@nostlabel.com` 
  });
};

export { 
  sendEmail, 
  sendEmailOTP, 
  sendPasswordResetOTPEmail, 
  sendWelcomeEmail, 
  sendOrderConfirmationEmail, 
  sendOrderStatusUpdateEmail,
  sendExchangeStatusEmail,
  verifyEmailOTP 
};
