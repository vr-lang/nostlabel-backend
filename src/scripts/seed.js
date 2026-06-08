import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import connectDB from "../config/db.js";

dotenv.config();

const seedDB = async () => {
  try {
    console.log("Connecting to Database for seeding...");
    await connectDB();
    console.log("Connected! Clearing existing data...");

    await Category.deleteMany({});
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    console.log("Cleared categories, products, and coupons.");

    // 1. Seed Categories
    console.log("Seeding categories...");
    const categoriesList = [
      { name: "T-Shirts", slug: "t-shirts", description: "Premium cotton everyday t-shirts", status: "ACTIVE" },
      { name: "Hoodies", slug: "hoodies", description: "Cozy heavy knit streetwear hoodies", status: "ACTIVE" },
      { name: "Shirts", slug: "shirts", description: "Formal and casual relaxed linen shirts", status: "ACTIVE" },
      { name: "Oversized T-Shirts", slug: "oversized-t-shirts", description: "Ultra-comfortable drop-shoulder tees", status: "ACTIVE" },
    ];
    const createdCategories = await Category.insertMany(categoriesList);
    const tshirtsCategory = createdCategories.find((c) => c.name === "T-Shirts");
    const oversizedCategory = createdCategories.find((c) => c.name === "Oversized T-Shirts");
    console.log("Seeded 4 categories.");

    // 2. Seed Launch Product with Variants
    console.log("Seeding launch product...");
    const productData = {
      name: "Nostlable Signature Heavyweight Tee",
      slug: "nostlable-signature-heavyweight-tee",
      description: "Crafted from 280 GSM long-staple organic cotton. This tee features an optimized drop-shoulder silhouette, pre-shrunk fabric, and double-needle collar stitch detailing for premium durability and a structured drape.",
      brand: "Nostlable",
      category: tshirtsCategory._id,
      price: 1499,
      discountPrice: 1199,
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Black", "White", "Blue", "Red"],
      images: [
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000",
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=1000",
      ],
      featured: true,
      bestseller: true,
      newArrival: true,
      rating: 4.8,
      reviewCount: 15,
      seoTitle: "Nostlable Signature Heavyweight Cotton Tee",
      seoDescription: "Shop the Nostlable signature 280 GSM heavyweight cotton drop-shoulder T-shirt. Premium everyday luxury streetwear.",
      status: "ACTIVE",
      variants: [
        // Black Variants
        { size: "S", color: "Black", stock: 50, sku: "NST-SIG-S-BLK" },
        { size: "M", color: "Black", stock: 100, sku: "NST-SIG-M-BLK" },
        { size: "L", color: "Black", stock: 100, sku: "NST-SIG-L-BLK" },
        { size: "XL", color: "Black", stock: 50, sku: "NST-SIG-XL-BLK" },
        { size: "XXL", color: "Black", stock: 20, sku: "NST-SIG-XXL-BLK" },
        // White Variants
        { size: "S", color: "White", stock: 40, sku: "NST-SIG-S-WHT" },
        { size: "M", color: "White", stock: 80, sku: "NST-SIG-M-WHT" },
        { size: "L", color: "White", stock: 80, sku: "NST-SIG-L-WHT" },
        { size: "XL", color: "White", stock: 40, sku: "NST-SIG-XL-WHT" },
        // Blue Variants
        { size: "M", color: "Blue", stock: 50, sku: "NST-SIG-M-BLU" },
        { size: "L", color: "Blue", stock: 50, sku: "NST-SIG-L-BLU" },
        // Red Variants
        { size: "M", color: "Red", stock: 30, sku: "NST-SIG-M-RED" },
        { size: "L", color: "Red", stock: 30, sku: "NST-SIG-L-RED" },
      ],
    };

    const product = new Product(productData);
    await product.save(); // save triggers stock summary recalculations
    console.log(`Seeded product: ${product.name} with ${product.variants.length} variants. Stock: ${product.stock}`);

    // 3. Seed Coupon
    console.log("Seeding launch coupon...");
    const couponData = {
      code: "LAUNCH20",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minimumOrderValue: 999,
      usageLimit: 1000,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      isActive: true,
    };
    const coupon = await Coupon.create(couponData);
    console.log(`Seeded coupon: ${coupon.code}`);

    // 4. Seed Admin
    console.log("Seeding admin account from environment variables...");
    const adminName = process.env.ADMIN_NAME;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminName && adminEmail && adminPassword) {
      const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
      if (!existingAdmin) {
        await User.create({
          name: adminName,
          email: adminEmail.toLowerCase(),
          password: adminPassword,
          role: "ADMIN",
        });
        console.log(`Seeded admin: ${adminEmail.toLowerCase()}`);
      } else {
        console.log(`Admin account ${adminEmail} already exists.`);
      }
    } else {
      console.log("Skipped admin seeding (ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD not configured).");
    }

    console.log("\n Database Seeding Completed Successfully! :)");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedDB();
