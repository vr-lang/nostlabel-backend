import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/Product.js"; // Register Product schema
import HomepageOffer from "../models/HomepageOffer.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const offer = await HomepageOffer.findOne().populate("products");
    console.log("=== DB HOMEPAGE OFFER ===");
    if (offer) {
      console.log(JSON.stringify(offer, null, 2));
    } else {
      console.log("No homepage offer configuration found.");
    }
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

run();
