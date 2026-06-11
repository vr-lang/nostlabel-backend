import Offer from "../models/Offer.js";
import Order from "../models/Order.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper to check if category name matches
const isCategoryMatch = (productCategory, targetCategory) => {
  if (!productCategory || !targetCategory) return false;
  
  const categoryName = (typeof productCategory === 'object' && productCategory.name)
    ? productCategory.name.toLowerCase()
    : String(productCategory).toLowerCase();

  const categorySlug = (typeof productCategory === 'object' && productCategory.slug)
    ? productCategory.slug.toLowerCase()
    : String(productCategory).toLowerCase();
    
  const target = targetCategory.toLowerCase().trim();
  
  return categoryName === target || 
         categorySlug === target || 
         categoryName.includes(target) || 
         target.includes(categoryName);
};

// Promotional calculation engine
export const calculateOfferDiscount = (cartItems, offer) => {
  if (!offer || !offer.isActive || !cartItems || cartItems.length === 0) {
    return { discountAmount: 0, appliedOffer: null };
  }

  const now = new Date();
  if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) {
    return { discountAmount: 0, appliedOffer: null };
  }

  let discountAmount = 0;
  const rules = offer.rules || {};

  switch (offer.offerType) {
    case "ANNOUNCEMENT_ONLY": {
      return { discountAmount: 0, appliedOffer: offer };
    }

    case "FIXED_BUNDLE_PRICE": {
      const buyQuantity = rules.buyQuantity || 2;
      const buyCategory = rules.buyCategory;
      const bundlePrice = rules.bundlePrice;

      if (!buyCategory || bundlePrice === undefined) {
        return { discountAmount: 0, appliedOffer: null };
      }

      const eligibleItems = [];
      cartItems.forEach((item) => {
        const product = item.product;
        if (product && isCategoryMatch(product.category, buyCategory)) {
          const itemPrice = product.discountPrice || product.price;
          for (let i = 0; i < item.quantity; i++) {
            eligibleItems.push({
              price: itemPrice,
              productId: product._id || product.id
            });
          }
        }
      });

      if (eligibleItems.length < buyQuantity) {
        return { discountAmount: 0, appliedOffer: null };
      }

      eligibleItems.sort((a, b) => b.price - a.price);

      const numBundles = Math.floor(eligibleItems.length / buyQuantity);
      for (let b = 0; b < numBundles; b++) {
        const bundleItems = eligibleItems.slice(b * buyQuantity, (b + 1) * buyQuantity);
        const bundleOriginalTotal = bundleItems.reduce((sum, item) => sum + item.price, 0);
        if (bundleOriginalTotal > bundlePrice) {
          discountAmount += (bundleOriginalTotal - bundlePrice);
        }
      }
      break;
    }

    case "BUY_X_GET_Y": {
      const buyQuantity = rules.buyQuantity || 2;
      const buyCategory = rules.buyCategory;
      const getYQuantity = rules.getYQuantity || 1;
      const getYCategory = rules.getYCategory || buyCategory;
      const getYDiscountType = rules.getYDiscountType || "FREE";
      const getYDiscountValue = rules.getYDiscountValue || 100;

      if (!buyCategory) {
        return { discountAmount: 0, appliedOffer: null };
      }

      const eligibleX = [];
      const eligibleY = [];

      cartItems.forEach((item) => {
        const product = item.product;
        if (!product) return;
        
        const itemPrice = product.discountPrice || product.price;
        const isX = isCategoryMatch(product.category, buyCategory);
        const isY = isCategoryMatch(product.category, getYCategory);

        for (let i = 0; i < item.quantity; i++) {
          const cartSingle = { price: itemPrice, productId: product._id || product.id };
          if (isX) eligibleX.push(cartSingle);
          if (isY) eligibleY.push(cartSingle);
        }
      });

      if (buyCategory.toLowerCase() === getYCategory.toLowerCase()) {
        eligibleX.sort((a, b) => b.price - a.price);
        const totalGroupSize = buyQuantity + getYQuantity;
        const numGroups = Math.floor(eligibleX.length / totalGroupSize);
        
        for (let g = 0; g < numGroups; g++) {
          const group = eligibleX.slice(g * totalGroupSize, (g + 1) * totalGroupSize);
          const freeItems = group.slice(-getYQuantity);
          freeItems.forEach(item => {
            if (getYDiscountType === "FREE") {
              discountAmount += item.price;
            } else if (getYDiscountType === "PERCENTAGE") {
              discountAmount += item.price * (getYDiscountValue / 100);
            }
          });
        }
      } else {
        if (eligibleX.length >= buyQuantity && eligibleY.length > 0) {
          eligibleY.sort((a, b) => a.price - b.price);
          const numAwards = Math.floor(eligibleX.length / buyQuantity);
          const itemsToDiscount = eligibleY.slice(0, Math.min(numAwards * getYQuantity, eligibleY.length));
          
          itemsToDiscount.forEach(item => {
            if (getYDiscountType === "FREE") {
              discountAmount += item.price;
            } else if (getYDiscountType === "PERCENTAGE") {
              discountAmount += item.price * (getYDiscountValue / 100);
            }
          });
        }
      }
      break;
    }

    case "PERCENTAGE_DISCOUNT": {
      const pct = rules.discountPercentage || 0;
      const appCats = rules.applicableCategories || [];
      
      cartItems.forEach(item => {
        const product = item.product;
        if (!product) return;

        const isApplicable = appCats.length === 0 || appCats.some(cat => isCategoryMatch(product.category, cat));
        if (isApplicable) {
          const itemPrice = product.discountPrice || product.price;
          discountAmount += itemPrice * item.quantity * (pct / 100);
        }
      });
      break;
    }

    case "FIXED_DISCOUNT": {
      const amt = rules.discountAmount || 0;
      const minVal = rules.minOrderValue || 0;
      
      let cartSubtotal = 0;
      cartItems.forEach(item => {
        const product = item.product;
        if (product) {
          cartSubtotal += (product.discountPrice || product.price) * item.quantity;
        }
      });

      if (cartSubtotal >= minVal) {
        discountAmount = amt;
        if (discountAmount > cartSubtotal) {
          discountAmount = cartSubtotal;
        }
      }
      break;
    }
  }

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    appliedOffer: discountAmount > 0 ? offer : null
  };
};

// Admin: Create Offer
const createOffer = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    offerType,
    isActive,
    startDate,
    endDate,
    priority,
    displayLocation,
    rules
  } = req.body;

  if (!title || !offerType || !startDate || !endDate) {
    throw new ApiError(400, "Missing required offer fields");
  }

  const offer = await Offer.create({
    title,
    description,
    offerType,
    isActive: isActive !== undefined ? isActive : true,
    startDate,
    endDate,
    priority: priority || 0,
    displayLocation: displayLocation || "TOP_BAR",
    rules: rules || {},
  });

  return res
    .status(201)
    .json(new ApiResponse(201, offer, "Offer created successfully"));
});

// Admin: Update Offer
const updateOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const offer = await Offer.findById(id);

  if (!offer) {
    throw new ApiError(404, "Offer not found");
  }

  const updatedOffer = await Offer.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedOffer, "Offer updated successfully"));
});

// Admin: Delete Offer
const deleteOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const offer = await Offer.findById(id);

  if (!offer) {
    throw new ApiError(404, "Offer not found");
  }

  await Offer.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Offer deleted successfully"));
});

// Admin: List all offers (with metrics if possible)
const getOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({}).sort({ priority: -1, createdAt: -1 });

  // Get usage stats per offer code or ID
  const offersWithMetrics = await Promise.all(
    offers.map(async (offer) => {
      const matchingOrders = await Order.find({
        offerId: offer._id,
        orderStatus: { $ne: "CANCELLED" },
        paymentStatus: { $ne: "FAILED" },
      });

      const totalUsage = matchingOrders.length;
      const revenueGenerated = matchingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalDiscountApplied = matchingOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);

      return {
        ...offer.toObject(),
        metrics: {
          totalUsage,
          revenueGenerated,
          totalDiscountApplied,
        },
      };
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, offersWithMetrics, "Offers retrieved successfully"));
});

// Customer: Get Active Offers
const getActiveOffers = asyncHandler(async (req, res) => {
  const now = new Date();
  const activeOffers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ priority: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, activeOffers, "Active offers retrieved successfully"));
});

export { createOffer, updateOffer, deleteOffer, getOffers, getActiveOffers };
