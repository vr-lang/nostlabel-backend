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

    // URL-encode password in case it contains special characters like '@'
    const encodedPassword = encodeURIComponent(password);

    return `${protocol}${username}:${encodedPassword}@${host}`;
  } catch (error) {
    console.error("Error sanitizing MONGODB_URI:", error.message);
    return uri;
  }
};

const connectDB = async () => {
  try {
    const rawUri = process.env.MONGODB_URI;
    const sanitizedUri = sanitizeMongoUri(rawUri);
    
    const connectionInstance = await mongoose.connect(sanitizedUri);
    console.log(`\n MongoDB Connected! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("MONGODB Connection error: ", error);
    process.exit(1);
  }
};

export default connectDB;
