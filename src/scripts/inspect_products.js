import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const products = await Product.find().limit(5);
    console.log("=== DB PRODUCTS ===");
    for (const p of products) {
      console.log(`Product ID: ${p._id}`);
      console.log(`Name: ${p.name}`);
      console.log(`Images:`, JSON.stringify(p.images));
      console.log("-------------------");
    }
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

run();
