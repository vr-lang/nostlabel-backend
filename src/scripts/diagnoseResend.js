import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const diagnose = async () => {
  const apiKey = process.env.RESEND_API_KEY;
  console.log("=== RESEND API DIAGNOSTIC ===");
  console.log("API Key length:", apiKey ? apiKey.length : 0);
  console.log("API Key starts with:", apiKey ? apiKey.substring(0, 7) + "..." : "N/A");
  
  if (!apiKey || apiKey === "mock") {
    console.log("Diagnostic stopped: Key is set to mock.");
    return;
  }

  const resend = new Resend(apiKey);
  try {
    console.log("Querying Resend API for domains list...");
    const domains = await resend.domains.list();
    if (domains.error) {
      console.error("❌ Resend API returned an error:", domains.error);
    } else {
      console.log("✓ Resend API connection successful!");
      console.log("Domains list response:", JSON.stringify(domains.data, null, 2));
    }
  } catch (error) {
    console.error("❌ Network or library crash during API call:", error.message);
  }
};

diagnose();
