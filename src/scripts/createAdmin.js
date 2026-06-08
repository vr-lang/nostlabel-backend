import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import connectDB from "../config/db.js";

dotenv.config();

const createAdmin = async () => {
  try {
    const adminName = process.env.ADMIN_NAME;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminName || !adminEmail || !adminPassword) {
      console.error("Error: ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be configured in environment variables.");
      process.exit(1);
    }

    console.log("Connecting to Database to create admin...");
    await connectDB();
    console.log("Connected. Verifying existing admin accounts...");

    // Check if the admin account already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });

    if (existingUser) {
      if (existingUser.role === "ADMIN") {
        console.log(`Info: Admin account already exists for email: ${adminEmail}. No action taken.`);
        await mongoose.connection.close();
        process.exit(0);
      } else {
        console.error(`Error: The email ${adminEmail} is already registered to a CUSTOMER account. Cannot escalate role.`);
        await mongoose.connection.close();
        process.exit(1);
      }
    }

    // Create new admin account
    // Password will be automatically hashed via User schema pre-save hook
    await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: "ADMIN",
    });

    console.log(`\n✓ Success: Admin account created successfully!`);
    console.log(`  Name: ${adminName}`);
    console.log(`  Email: ${adminEmail.toLowerCase()}`);
    console.log(`  Role: ADMIN`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin account: ", error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

createAdmin();
