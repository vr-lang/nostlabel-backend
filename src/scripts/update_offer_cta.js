import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import HomepageOffer from "../models/HomepageOffer.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const result = await HomepageOffer.updateOne({}, {
      $set: { ctaLink: "/collections/oversized-t-shirts" }
    });
    console.log("Updated offer CTA Link in MongoDB. Match count:", result.matchedCount, ", Modified count:", result.modifiedCount);
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

run();
