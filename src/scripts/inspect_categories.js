import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Category from "../models/Category.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const categories = await Category.find();
    console.log("=== DB CATEGORIES ===");
    for (const c of categories) {
      console.log(`Category ID: ${c._id}`);
      console.log(`Name: ${c.name}`);
      console.log(`Slug: ${c.slug}`);
      console.log("-------------------");
    }
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

run();
