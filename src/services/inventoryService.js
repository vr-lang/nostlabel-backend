import Product from "../models/Product.js";
import InventoryLog from "../models/InventoryLog.js";

/**
 * Adjust stock levels for a product variant and log the change
 * @param {string} productId - Product ID
 * @param {string} size - Size (S, M, L, XL, XXL)
 * @param {string} color - Color (e.g. Black, White, etc.)
 * @param {number} quantity - Quantity to adjust (negative for sales/reduction, positive for returns/restoration)
 * @param {string} type - Log type: 'SALE', 'RETURN', 'MANUAL'
 * @param {string} createdBy - User ID who triggered the action (e.g. customer/admin)
 */
const adjustStock = async (productId, size, color, quantity, type, createdBy = null) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Find the variant
    const variantIndex = product.variants.findIndex(
      (v) => v.size === size && v.color.toLowerCase() === color.toLowerCase()
    );

    if (variantIndex === -1) {
      throw new Error(`Variant not found for size: ${size}, color: ${color}`);
    }

    const currentStock = product.variants[variantIndex].stock;
    const newStock = currentStock + quantity;

    if (newStock < 0) {
      throw new Error(`Insufficient stock for variant size: ${size}, color: ${color}. Available: ${currentStock}, Requested: ${Math.abs(quantity)}`);
    }

    // Update variant stock
    product.variants[variantIndex].stock = newStock;
    
    // Save product (this will trigger the pre-save hook to update total stock)
    await product.save();

    // Create inventory log entry
    const log = new InventoryLog({
      product: productId,
      variant: { size, color },
      type,
      quantity,
      createdBy,
    });
    await log.save();

    console.log(`[Inventory] Stock adjusted for ${product.name} (${size}/${color}): ${currentStock} -> ${newStock} (${type})`);
    return { success: true, newStock };
  } catch (error) {
    console.error("Inventory adjustment error:", error.message);
    throw error;
  }
};

/**
 * Process stock reduction for order checkout
 */
const reduceStockForOrder = async (order, createdBy = null) => {
  for (const item of order.items) {
    // Reductions are negative adjustments
    await adjustStock(item.product, item.size, item.color, -item.quantity, "SALE", createdBy || order.customer);
  }
};

/**
 * Restore stock for cancelled or returned orders
 */
const restoreStockForOrder = async (order, type = "RETURN", createdBy = null) => {
  for (const item of order.items) {
    // Restorations are positive adjustments
    await adjustStock(item.product, item.size, item.color, item.quantity, type, createdBy);
  }
};

export { adjustStock, reduceStockForOrder, restoreStockForOrder };
