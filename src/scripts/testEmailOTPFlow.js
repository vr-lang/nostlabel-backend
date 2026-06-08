import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import connectDB from "../config/db.js";
import OTP from "../models/OTP.js";
import User from "../models/User.js";
import { sendEmailOTP, verifyEmailOTP } from "../services/emailService.js";

dotenv.config();

const runTests = async () => {
  console.log("=== STARTING EMAIL OTP FLOW INTEGRATION TESTS ===");
  
  // 1. Establish DB Connection
  await connectDB();

  const testEmail = "tester-otp@nostlable.com";

  try {
    // Clean up any stale test records
    await OTP.deleteMany({ email: testEmail });
    await User.deleteMany({ email: testEmail });
    console.log("✓ Stale test records cleaned up successfully.");

    // --- TEST CASE 1: Send Email OTP ---
    console.log("\n[Test Case 1] Requesting Email OTP...");
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save record
    await OTP.findOneAndUpdate(
      { email: testEmail },
      {
        otpHash: hashedOtp,
        attempts: 0,
        expiresAt,
        verified: false,
        lastSentAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Dispatch mock mail
    const sendRes = await sendEmailOTP(testEmail, otpCode);
    if (sendRes.success) {
      console.log("✓ OTP dispatch mock completed successfully.");
    } else {
      throw new Error("Failed to dispatch OTP mail: " + sendRes.error);
    }

    // Check DB state
    let otpRecord = await OTP.findOne({ email: testEmail });
    if (otpRecord && otpRecord.verified === false) {
      console.log("✓ OTP record successfully stored in database with verified = false.");
    } else {
      throw new Error("OTP record was not stored correctly in database.");
    }

    // --- TEST CASE 2: Incorrect OTP entry and attempts count ---
    console.log("\n[Test Case 2] Submitting incorrect OTP codes...");
    const maxAttempts = 5;
    for (let i = 1; i <= maxAttempts; i++) {
      const verifyRes = await verifyEmailOTP(testEmail, "000000"); // wrong code
      if (!verifyRes.success) {
        console.log(`  - Attempt ${i}: Rejected correctly. Remaining attempts: ${maxAttempts - i}`);
      } else {
        throw new Error(`Attempt ${i} should have failed but succeeded.`);
      }
    }

    // 6th attempt should block immediately with lockout message
    const verifyRes6 = await verifyEmailOTP(testEmail, otpCode);
    if (!verifyRes6.success && verifyRes6.message.includes("Maximum OTP verification attempts exceeded")) {
      console.log("✓ Lockout after 5 failed attempts verified. 6th attempt correctly blocked.");
    } else {
      throw new Error("Lockout failed to activate. Succeeded or wrong error message: " + JSON.stringify(verifyRes6));
    }

    // Clear locked record to test successful verification
    await OTP.deleteMany({ email: testEmail });

    // --- TEST CASE 3: Successful Verification Flow ---
    console.log("\n[Test Case 3] Requesting new OTP and verifying with correct code...");
    const freshOtpCode = crypto.randomInt(100000, 999999).toString();
    const freshHashedOtp = crypto.createHash("sha256").update(freshOtpCode).digest("hex");
    const freshExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await OTP.findOneAndUpdate(
      { email: testEmail },
      {
        otpHash: freshHashedOtp,
        attempts: 0,
        expiresAt: freshExpiresAt,
        verified: false,
        lastSentAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const successVerify = await verifyEmailOTP(testEmail, freshOtpCode);
    if (successVerify.success) {
      console.log("✓ OTP verification succeeded with correct code.");
    } else {
      throw new Error("Verification failed with correct code: " + successVerify.message);
    }

    otpRecord = await OTP.findOne({ email: testEmail });
    if (otpRecord && otpRecord.verified === true) {
      console.log("✓ DB record updated: verified = true.");
    } else {
      throw new Error("DB record state failed to update verified field to true.");
    }

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED!");
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
};

runTests();
