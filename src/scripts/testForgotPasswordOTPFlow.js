import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { forgotPassword, verifyResetOTP, resetPassword } from "../controllers/authController.js";

dotenv.config();

// Force mock Resend mode
process.env.RESEND_API_KEY = "mock";

const runForgotPasswordTests = async () => {
  console.log("=== STARTING FORGOT PASSWORD OTP INTEGRATION TESTS ===");
  
  await connectDB();

  const testEmail = "tester-forgot-pwd@nostlabel.com";
  let capturedOtp = null;

  // Single clean monkey-patch of console.log
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog("[TEST-LOG]", ...args);
    
    // Check if we can extract the OTP
    const logStr = args.join(" ");
    const match = logStr.match(/verification code is:\s*(\d{6})/i);
    if (match && match[1]) {
      capturedOtp = match[1];
      originalLog("[TEST-MATCHED-OTP]", capturedOtp);
    }
  };

  // Helper to execute and await async handlers
  const executeHandler = (handler, req) => {
    return new Promise((resolve, reject) => {
      const res = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          resolve(this);
          return this;
        },
      };
      
      handler(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  };

  try {
    // Clean up test records
    await User.deleteMany({ email: testEmail });
    console.log("✓ Stale test records cleaned up.");

    // Create test user
    const testUser = await User.create({
      name: "Forgot Password Tester",
      email: testEmail,
      password: "OldPassword123",
      role: "CUSTOMER",
    });
    console.log("✓ Test user created successfully.");

    // --- TEST CASE 1: Trigger Forgot Password OTP ---
    console.log("\n[Test Case 1] Requesting Forgot Password OTP...");
    const req1 = { body: { email: testEmail } };
    
    const res1 = await executeHandler(forgotPassword, req1);

    console.log(`Debug post-call: Code = ${res1.statusCode}, Captured OTP = ${capturedOtp}`);

    if (res1.statusCode === 200 && capturedOtp) {
      console.log(`✓ OTP generated and captured successfully: ${capturedOtp}`);
    } else {
      throw new Error(`Failed to request forgot password OTP. Code: ${res1.statusCode}, Captured: ${capturedOtp}`);
    }

    // Verify DB user fields
    let userRecord = await User.findOne({ email: testEmail });
    if (userRecord.forgotPasswordOTP && userRecord.forgotPasswordOTPExpires) {
      console.log("✓ User record in database updated with hashed OTP and expiry.");
    } else {
      throw new Error("User record was not updated with OTP fields in database.");
    }

    // --- TEST CASE 2: Incorrect OTP entry & Attempts Lockdown ---
    console.log("\n[Test Case 2] Submitting incorrect OTP codes...");
    const maxAttempts = 5;
    for (let i = 1; i <= maxAttempts; i++) {
      const reqFail = { body: { email: testEmail, otp: "000000" } };
      
      try {
        await executeHandler(verifyResetOTP, reqFail);
        throw new Error("Verification of incorrect OTP should have thrown an error but succeeded.");
      } catch (error) {
        console.log(`  - Attempt ${i}: Rejected correctly: "${error.message}"`);
      }
    }

    // 6th attempt should block immediately due to lockout
    const reqFail6 = { body: { email: testEmail, otp: capturedOtp } };
    try {
      await executeHandler(verifyResetOTP, reqFail6);
      throw new Error("6th attempt should have been blocked by lockout but succeeded.");
    } catch (error) {
      if (error.message.includes("Maximum OTP verification attempts exceeded")) {
        console.log("✓ Lockout after 5 failed attempts verified. 6th attempt correctly blocked.");
      } else {
        throw new Error(`Expected lockout message but got: "${error.message}"`);
      }
    }

    // Reset OTP to test successful verification
    console.log("\n[Test Case 3] Requesting new OTP for successful verification...");
    capturedOtp = null;
    const reqResend = { body: { email: testEmail } };
    await executeHandler(forgotPassword, reqResend);

    if (!capturedOtp) {
      throw new Error("Failed to capture new OTP on resend.");
    }

    console.log(`✓ New OTP generated and captured: ${capturedOtp}`);

    // Verify with correct OTP
    console.log("Verifying correct OTP...");
    const reqVerify = { body: { email: testEmail, otp: capturedOtp } };
    const resVerify = await executeHandler(verifyResetOTP, reqVerify);

    let resetSessionToken = null;
    if (resVerify.statusCode === 200 && resVerify.body && resVerify.body.data) {
      resetSessionToken = resVerify.body.data.resetSessionToken;
      console.log(`✓ OTP verified successfully. resetSessionToken received: ${resetSessionToken.slice(0, 10)}...`);
    } else {
      throw new Error("Failed to receive resetSessionToken after successful verification.");
    }

    // Verify DB states: OTP cleared, session token hashed and stored
    userRecord = await User.findOne({ email: testEmail });
    if (!userRecord.forgotPasswordOTP && userRecord.forgotPasswordResetSessionToken) {
      console.log("✓ DB state updated: OTP fields cleared, forgotPasswordResetSessionToken populated.");
    } else {
      throw new Error("DB fields were not updated correctly upon successful OTP verification.");
    }

    // --- TEST CASE 4: Reset Password using Session Token ---
    console.log("\n[Test Case 4] Resetting password with session token...");
    const reqReset = { body: { resetSessionToken, newPassword: "NewPassword123" } };
    const resReset = await executeHandler(resetPassword, reqReset);

    if (resReset.statusCode === 200) {
      console.log("✓ Password reset completed successfully.");
    } else {
      throw new Error(`Reset password endpoint returned code: ${resReset.statusCode}`);
    }

    // Verify DB states: session token cleared, password updated
    userRecord = await User.findOne({ email: testEmail }).select("+password");
    if (userRecord.forgotPasswordResetSessionToken === undefined) {
      console.log("✓ DB state updated: forgotPasswordResetSessionToken cleared.");
    } else {
      throw new Error("Session token was not cleared after password reset.");
    }

    const bcrypt = (await import("bcryptjs")).default;
    const isNewPasswordValid = await bcrypt.compare("NewPassword123", userRecord.password);
    if (isNewPasswordValid) {
      console.log("✓ New password hashed and stored successfully in database.");
    } else {
      throw new Error("Stored password does not match the new password.");
    }

    console.log("\n=== ALL FORGOT PASSWORD OTP TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("\n❌ FORGOT PASSWORD TEST SUITE FAILED!");
    console.error(error);
  } finally {
    // Restore console.log
    console.log = originalLog;
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
};

runForgotPasswordTests();
