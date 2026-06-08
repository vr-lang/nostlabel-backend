import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { Resend } from "resend";

// Handle uncaught exceptions globally
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down server...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect database and listen
const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, async () => {
      console.log(`\n Server is running on port: ${PORT}`);
      console.log(` API Docs available at: http://localhost:${PORT}/api-docs`);
      console.log(` Cloudinary Configured Cloud: ${process.env.CLOUDINARY_CLOUD_NAME || "NONE"}`);
      
      // Resend Diagnostics
      const apiKey = process.env.RESEND_API_KEY;
      const emailFrom = process.env.EMAIL_FROM;
      console.log(` Resend API Key: ${apiKey ? `YES (Slice: ${apiKey.slice(0, 10)}...)` : "NO"}`);
      console.log(` Resend Sender Address: ${emailFrom || "onboarding@resend.dev"}`);

      if (apiKey && apiKey !== "mock") {
        try {
          const resend = new Resend(apiKey);
          const response = await resend.domains.list();
          if (response.error) {
            console.warn(` ⚠️ Resend Domain Query Warning:`, response.error.message || response.error);
          } else if (response.data && response.data.data) {
            const domainNames = response.data.data.map((d) => d.name);
            console.log(` Resend Verified Domains: [${domainNames.join(", ")}]`);
            
            if (emailFrom) {
              const senderDomain = emailFrom.split("@")[1];
              if (senderDomain && !domainNames.includes(senderDomain)) {
                console.error(` ❌ BRAND MISMATCH CRITICAL WARNING: Configured EMAIL_FROM domain "${senderDomain}" does NOT match any verified Resend account domains: [${domainNames.join(", ")}]`);
              } else {
                console.log(` ✓ Resend Sender Domain Alignment Confirmed: "${senderDomain}"`);
              }
            }
          }
        } catch (err) {
          console.warn(` ⚠️ Resend Connection Diagnostic Failed: ${err.message}`);
        }
      }
    });
  } catch (error) {
    console.error("Database connection failure, starting server failed: ", error.message);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections globally
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down gracefully...");
  console.error(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
});
