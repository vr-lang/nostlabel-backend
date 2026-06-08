import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: Access token is missing");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decodedToken._id).select("-password");

    if (!user) {
      throw new ApiError(401, "Unauthorized: Invalid Access Token");
    }

    if (user.isBlocked) {
      throw new ApiError(403, "Forbidden: Your account has been suspended");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});

const optionalVerifyJWT = async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decodedToken._id).select("-password");
      if (user && !user.isBlocked) {
        req.user = user;
      }
    } catch (error) {
      // Fail silently for guests
    }
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    next();
  } else {
    throw new ApiError(403, "Forbidden: Admin access only");
  }
};

const isCustomer = (req, res, next) => {
  if (req.user && req.user.role === "CUSTOMER") {
    next();
  } else {
    throw new ApiError(403, "Forbidden: Customer access only");
  }
};

export { verifyJWT, optionalVerifyJWT, isAdmin, isCustomer };

