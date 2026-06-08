import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { 
  sendEmailOTP, 
  sendPasswordResetOTPEmail, 
  sendWelcomeEmail, 
  verifyEmailOTP 
} from "../services/emailService.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (for refresh token)
};

const accessCookieOptions = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000, // 15 mins (for access token)
};

// Generate access and refresh tokens, store refresh token in db and return
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // 1. Verify that email is unique
  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // 2. Verify that the email has been verified via OTP
  const otpRecord = await OTP.findOne({ email, verified: true });
  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    throw new ApiError(
      400,
      "Email address has not been verified. Please complete OTP verification first."
    );
  }

  const role = "CUSTOMER";

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role,
    emailVerified: true,
  });

  const createdUser = await User.findById(user._id).select("-password");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 3. Delete the temporary OTP verification record
  await OTP.deleteOne({ _id: otpRecord._id });

  // 4. Send registration confirmation welcome email
  await sendWelcomeEmail(createdUser.email, createdUser.name);

  // 5. Automatically generate access and refresh tokens on successful registration
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(createdUser._id);

  return res
    .status(201)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, accessToken, refreshToken },
        "User registered successfully"
      )
    );
});

const sendEmailOTPHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // 1. Check duplicate email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email is already registered to another account");
  }

  // 2. Generate secure 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // 3. Hash the OTP using SHA-256 for secure DB storage
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  // 4. Expiry time calculation (default 5 minutes)
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // 5. Store/Update OTP record in database
  await OTP.findOneAndUpdate(
    { email },
    {
      otpHash: hashedOtp,
      attempts: 0,
      expiresAt,
      verified: false,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // 6. Send the OTP via Email Service
  const emailRes = await sendEmailOTP(email, otp);
  if (!emailRes.success) {
    throw new ApiError(500, "Failed to send verification email. Please try again.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP sent successfully"));
});

const verifyEmailOTPHandler = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // 1. Verify OTP using reusable service helper
  const result = await verifyEmailOTP(email, otp);
  if (!result.success) {
    throw new ApiError(result.status || 400, result.message);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verified successfully"));
});

const resendEmailOTPHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // 1. Check duplicate email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email is already registered to another account");
  }

  const otpRecord = await OTP.findOne({ email });
  if (otpRecord) {
    // 2. Limit resends to prevent abuse (ensure at least 60 seconds have elapsed)
    const timeElapsed = Date.now() - new Date(otpRecord.lastSentAt || otpRecord.updatedAt).getTime();
    if (timeElapsed < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - timeElapsed) / 1000);
      throw new ApiError(400, `Please wait ${waitSeconds} seconds before requesting another OTP resend.`);
    }
  }

  // 3. Generate secure OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  // 4. Expiry
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const resendCount = otpRecord ? (otpRecord.resendCount || 0) + 1 : 1;

  // 5. Save/Update record
  await OTP.findOneAndUpdate(
    { email },
    {
      otpHash: hashedOtp,
      attempts: 0,
      expiresAt,
      verified: false,
      resendCount,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // 6. Dispatch Email
  const emailRes = await sendEmailOTP(email, otp);
  if (!emailRes.success) {
    throw new ApiError(500, "Failed to send verification email. Please try again.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP sent successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  if (user.role !== "CUSTOMER") {
    throw new ApiError(403, "Access denied: Please use the admin portal to sign in.");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account has been suspended by the administrator");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password");

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Customer logged in successfully"
      )
    );
});

const adminLoginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(404, "Admin account does not exist");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid admin credentials");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Access denied: Admin portal requires ADMIN privileges.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password");

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Admin logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // Remove refresh token from database
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", accessCookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decodedToken._id).select("+refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, accessCookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  const isPasswordCorrect = await user.comparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User profile fetched successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User with this email does not exist");
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // Hash OTP
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Store in User document
  user.forgotPasswordOTP = hashedOtp;
  user.forgotPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.forgotPasswordAttempts = 0;
  user.forgotPasswordResetSessionToken = undefined;
  user.forgotPasswordResetSessionExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // Send Email
  const emailResponse = await sendPasswordResetOTPEmail(user.email, otp);

  if (!emailResponse.success) {
    user.forgotPasswordOTP = undefined;
    user.forgotPasswordOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Failed to send reset OTP email");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset OTP sent to your email"));
});

const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User with this email does not exist");
  }

  if (!user.forgotPasswordOTP || !user.forgotPasswordOTPExpires) {
    throw new ApiError(400, "No password reset request found for this email");
  }

  if (user.forgotPasswordOTPExpires < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new OTP.");
  }

  if (user.forgotPasswordAttempts >= 5) {
    throw new ApiError(400, "Maximum OTP verification attempts exceeded. Please request a new OTP.");
  }

  user.forgotPasswordAttempts += 1;

  const isMatch = await bcrypt.compare(otp, user.forgotPasswordOTP);

  if (!isMatch) {
    await user.save({ validateBeforeSave: false });
    const remaining = 5 - user.forgotPasswordAttempts;
    throw new ApiError(400, `Invalid OTP. Verification attempts remaining: ${remaining}`);
  }

  // Generate temporary reset session token (32 bytes random hex)
  const resetSessionToken = crypto.randomBytes(32).toString("hex");
  const hashedSessionToken = crypto
    .createHash("sha256")
    .update(resetSessionToken)
    .digest("hex");

  user.forgotPasswordResetSessionToken = hashedSessionToken;
  user.forgotPasswordResetSessionExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  
  // Clear the OTP fields now that it's successfully verified
  user.forgotPasswordOTP = undefined;
  user.forgotPasswordOTPExpires = undefined;
  user.forgotPasswordAttempts = 0;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { resetSessionToken }, "OTP verified successfully. Session created."));
});

const resendResetOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User with this email does not exist");
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // Hash OTP
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Store in User document
  user.forgotPasswordOTP = hashedOtp;
  user.forgotPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.forgotPasswordAttempts = 0;
  user.forgotPasswordResetSessionToken = undefined;
  user.forgotPasswordResetSessionExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // Send Email
  const emailResponse = await sendPasswordResetOTPEmail(user.email, otp);

  if (!emailResponse.success) {
    user.forgotPasswordOTP = undefined;
    user.forgotPasswordOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Failed to send reset OTP email");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset OTP resent successfully"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { resetSessionToken, newPassword } = req.body;

  if (!resetSessionToken) {
    throw new ApiError(400, "Reset session token is required");
  }

  // Hash the incoming session token to match what's stored in the DB
  const hashedSessionToken = crypto
    .createHash("sha256")
    .update(resetSessionToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordResetSessionToken: hashedSessionToken,
    forgotPasswordResetSessionExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Reset session is invalid or has expired");
  }

  // Set new password (will be hashed automatically by userSchema pre-save hook)
  user.password = newPassword;

  // Clear all reset session and OTP fields
  user.forgotPasswordOTP = undefined;
  user.forgotPasswordOTPExpires = undefined;
  user.forgotPasswordAttempts = undefined;
  user.forgotPasswordResetSessionToken = undefined;
  user.forgotPasswordResetSessionExpires = undefined;
  user.refreshToken = undefined; // Invalidate current logins

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset completed successfully"));
});

// Address Sub-module Controllers
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  // If new address is set as default, mark existing addresses as false
  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.addresses.push(req.body);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.addresses, "Address added successfully"));
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user._id);

  user.addresses = user.addresses.filter(
    (addr) => addr._id.toString() !== addressId
  );
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.addresses, "Address deleted successfully"));
});

const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  return res
    .status(200)
    .json(new ApiResponse(200, user.addresses, "Addresses fetched successfully"));
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const { name, phone, profileImage } = req.body;
  const user = await User.findById(req.user._id);

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (profileImage !== undefined) user.profileImage = profileImage;

  await user.save();

  const updatedUser = await User.findById(user._id).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User profile updated successfully"));
});

const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user._id);

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  // If address is set as default, mark existing addresses as false
  if (req.body.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  // Update fields
  if (req.body.fullName !== undefined) address.fullName = req.body.fullName;
  if (req.body.phone !== undefined) address.phone = req.body.phone;
  if (req.body.addressLine1 !== undefined) address.addressLine1 = req.body.addressLine1;
  if (req.body.addressLine2 !== undefined) address.addressLine2 = req.body.addressLine2;
  if (req.body.city !== undefined) address.city = req.body.city;
  if (req.body.state !== undefined) address.state = req.body.state;
  if (req.body.country !== undefined) address.country = req.body.country;
  if (req.body.postalCode !== undefined) address.postalCode = req.body.postalCode;
  if (req.body.isDefault !== undefined) address.isDefault = req.body.isDefault;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.addresses, "Address updated successfully"));
});

export {
  registerUser,
  sendEmailOTPHandler,
  verifyEmailOTPHandler,
  resendEmailOTPHandler,
  loginUser,
  adminLoginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  forgotPassword,
  verifyResetOTP,
  resendResetOTP,
  resetPassword,
  addAddress,
  deleteAddress,
  getAddresses,
  updateCurrentUser,
  updateAddress,
};
