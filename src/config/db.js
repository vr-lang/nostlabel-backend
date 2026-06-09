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
    console.log("========== DATABASE DEBUG ==========");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("MONGODB_URI Exists:", !!process.env.MONGODB_URI);

    if (process.env.MONGODB_URI) {
      console.log(
        "MONGODB_URI Preview:",
        process.env.MONGODB_URI.substring(0, 25) + "..."
      );
    }

    const rawUri = process.env.MONGODB_URI;

    if (!rawUri) {
      throw new Error("MONGODB_URI environment variable is missing");
    }

    const sanitizedUri = sanitizeMongoUri(rawUri);

    console.log("Attempting MongoDB connection...");

    const connectionInstance = await mongoose.connect(sanitizedUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `MongoDB Connected! DB HOST: ${connectionInstance.connection.host}`
    );

    console.log("========== DATABASE CONNECTED ==========");
  } catch (error) {
    console.error("========== DATABASE ERROR ==========");
    console.error(error);
    console.error("====================================");

    process.exit(1);
  }
};

export default connectDB;