import crypto from "crypto";
import razorpayInstance from "../config/razorpay.js";

const createRazorpayOrder = async (orderId, amount, currency = "INR") => {
  try {
    // Razorpay amounts are represented in paisa (1 INR = 100 paisa)
    const options = {
      amount: Math.round(amount * 100),
      currency: currency,
      receipt: `receipt_${orderId}`,
    };

    // Fallback if Razorpay is not configured (mock mode)
    if (!razorpayInstance || process.env.RAZORPAY_KEY_ID === "rzp_test_NostlableKeyId123") {
      console.warn("Razorpay is running in MOCK mode due to dummy credentials.");
      return {
        id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
        entity: "order",
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: currency,
        receipt: options.receipt,
        status: "created",
        attempts: 0,
        notes: [],
        created_at: Math.floor(Date.now() / 1000),
        isMock: true,
      };
    }

    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay order creation error:", error.message);
    throw new Error(`Payment gateway error: ${error.message}`);
  }
};

const verifyRazorpaySignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    // Mock validation fallback
    if (razorpayOrderId.startsWith("order_mock_")) {
      return true;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    return generated_signature === razorpaySignature;
  } catch (error) {
    console.error("Signature verification error:", error.message);
    return false;
  }
};

const verifyWebhookSignature = (rawBody, signature, webhookSecret) => {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    return expectedSignature === signature;
  } catch (error) {
    console.error("Webhook signature verification error:", error.message);
    return false;
  }
};

const initiateRefund = async (paymentId, amount, notes = {}) => {
  try {
    if (!razorpayInstance || paymentId.startsWith("pay_mock_") || process.env.RAZORPAY_KEY_ID === "rzp_test_NostlableKeyId123") {
      console.log(`Mocking refund of amount ${amount} for payment ${paymentId}`);
      return {
        id: `rfnd_mock_${Math.random().toString(36).substring(2, 11)}`,
        entity: "refund",
        amount: Math.round(amount * 100),
        currency: "INR",
        payment_id: paymentId,
        status: "processed",
        created_at: Math.floor(Date.now() / 1000),
        isMock: true,
      };
    }

    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes: notes,
    });
    return refund;
  } catch (error) {
    console.error("Razorpay refund initiation error:", error.message);
    throw new Error(`Refund initiation error: ${error.message}`);
  }
};

export {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  initiateRefund,
};
