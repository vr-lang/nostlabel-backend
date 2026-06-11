import HomepageOffer from "../models/HomepageOffer.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get homepage offer (public)
export const getHomepageOffer = asyncHandler(async (req, res) => {
  let offer = await HomepageOffer.findOne().populate("products");
  
  if (!offer) {
    // Seed default if not exists
    offer = await HomepageOffer.create({
      title: "ANY 2 T-SHIRTS FOR ₹1400",
      subtitle: "LIMITED TIME OFFER",
      description: "Premium Oversized Tees",
      price: 1400,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      ctaText: "SHOP THE OFFER",
      ctaLink: "/collections/t-shirts",
      products: []
    });
    // Populate it (it will be empty but populated)
    offer = await HomepageOffer.findById(offer._id).populate("products");
  }

  // If products is empty, pull dynamically from products marked as featured as fallback
  if (!offer.products || offer.products.length === 0) {
    const featuredProducts = await Product.find({ featured: true, status: "ACTIVE" }).limit(2);
    // Convert Mongoose doc to plain object to attach products dynamically
    const offerObj = offer.toObject();
    offerObj.products = featuredProducts;
    return res.status(200).json(new ApiResponse(200, offerObj, "Homepage offer retrieved successfully"));
  }

  return res.status(200).json(new ApiResponse(200, offer, "Homepage offer retrieved successfully"));
});

// Update homepage offer (admin)
export const updateHomepageOffer = asyncHandler(async (req, res) => {
  const {
    title,
    subtitle,
    description,
    price,
    products,
    isActive,
    startDate,
    endDate,
    ctaText,
    ctaLink
  } = req.body;

  let offer = await HomepageOffer.findOne();
  if (!offer) {
    offer = await HomepageOffer.create({
      title: title || "ANY 2 T-SHIRTS FOR ₹1400",
      subtitle: subtitle || "LIMITED TIME OFFER",
      description: description || "Premium Oversized Tees",
      price: price || 1400,
      products: products || [],
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      ctaText: ctaText || "SHOP THE OFFER",
      ctaLink: ctaLink || "/collections/t-shirts"
    });
  } else {
    offer.title = title !== undefined ? title : offer.title;
    offer.subtitle = subtitle !== undefined ? subtitle : offer.subtitle;
    offer.description = description !== undefined ? description : offer.description;
    offer.price = price !== undefined ? price : offer.price;
    offer.products = products !== undefined ? products : offer.products;
    offer.isActive = isActive !== undefined ? isActive : offer.isActive;
    offer.startDate = startDate !== undefined ? startDate : offer.startDate;
    offer.endDate = endDate !== undefined ? endDate : offer.endDate;
    offer.ctaText = ctaText !== undefined ? ctaText : offer.ctaText;
    offer.ctaLink = ctaLink !== undefined ? ctaLink : offer.ctaLink;
    await offer.save();
  }

  const populated = await HomepageOffer.findById(offer._id).populate("products");
  return res.status(200).json(new ApiResponse(200, populated, "Homepage offer updated successfully"));
});
