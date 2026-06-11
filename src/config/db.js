import mongoose from "mongoose";

const sanitizeMongoUri = (uri) => {
  if (!uri) return uri;

  try {
    const protocolIndex = uri.indexOf("://");
    if (protocolIndex === -1) return uri;

    const protocol = uri.substring(0, protocolIndex + 3);
    const rest = uri.substring(protocolIndex + 3);

    const lastAtIndex = rest.lastIndexOf("@");
    if (lastAtIndex === -1) return uri;

    const credentials = rest.substring(0, lastAtIndex);
    const host = rest.substring(lastAtIndex + 1);

    const firstColonIndex = credentials.indexOf(":");
    if (firstColonIndex === -1) return uri;

    const username = credentials.substring(0, firstColonIndex);
    const password = credentials.substring(firstColonIndex + 1);

    const encodedPassword = encodeURIComponent(password);

    return `${protocol}${username}:${encodedPassword}@${host}`;
  } catch (error) {
    console.error("Error sanitizing MONGODB_URI:", error.message);
    return uri;
  }
};

const connectDB = async () => {
  try {
    console.log("========== ENVIRONMENT AUDIT ==========");
    const requiredEnv = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);

    if (missingEnv.length > 0) {
      console.error(`❌ CRITICAL CONFIGURATION ERROR: Missing required environment variables: ${missingEnv.join(", ")}`);
      process.exit(1);
    }
    console.log("✓ All critical configuration variables verified.");
    console.log("=======================================");

    console.log("========== DATABASE DEBUG ==========");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("Mongo URI exists:", !!process.env.MONGODB_URI);
    console.log("Mongo connection state:", mongoose.connection.readyState);

    const rawUri = process.env.MONGODB_URI;
    const sanitizedUri = sanitizeMongoUri(rawUri);

    console.log("Attempting MongoDB connection...");
    const connectionInstance = await mongoose.connect(sanitizedUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Mongo connection state after connect:", mongoose.connection.readyState);
    console.log("Mongo host:", mongoose.connection.host);
    console.log("========== DATABASE CONNECTED ==========");
  } catch (error) {
    console.error("========== DATABASE CONNECTION ERROR ==========");
    console.error("Connection failed with error details:", error.message || error);
    console.error("Current Mongo Connection State:", mongoose.connection.readyState);
    console.error("==============================================");
    process.exit(1);
  }
};

export default connectDB;