import { Router } from "express";
import {
  getDashboardMetrics,
  getAllOrdersAdmin,
  getAllProductsAdmin,
  getAllCustomersAdmin,
  toggleBlockUser,
  updateOrderStatus,
  getAnalytics,
  getReports,
  getInventoryStats,
  getInventoryList,
  getInventoryAlerts,
  getInventoryActivity,
  getInventoryAnalytics,
  getProductInventoryDetail,
  adjustProductStock,
  bulkInventoryActions,
  getOrderStats,
  getOrderByIdAdmin,
  getCustomerStats,
  getCustomerDetailAdmin,
  getCustomerOrdersAdmin,
  getCustomerTimelineAdmin,
  getCustomerNotesAdmin,
  createCustomerNoteAdmin,
  deleteCustomerNoteAdmin,
  getVipCustomersAdmin,
  getCustomerAnalyticsAdmin,
  deleteCustomerAdmin,
  getAnalyticsOverview,
  getAnalyticsRevenue,
  getAnalyticsFunnel,
  getAnalyticsCollections,
  getAnalyticsTopProducts,
  getAnalyticsCustomers,
  getAnalyticsGeography,
  getAnalyticsChannels,
  getAnalyticsInventory,
  getAnalyticsHealth,
  getTopSellingProducts,
  getProductPerformance,
  getBusinessActivity
} from "../controllers/adminController.js";
import {
  getAllExchangesAdmin,
  updateExchangeStatusAdmin
} from "../controllers/exchangeController.js";
import { verifyJWT, isAdmin } from "../middlewares/authMiddleware.js";
import { orderStatusUpdateValidator } from "../validators/orderValidator.js";

const router = Router();

// Protect all admin routes
router.use(verifyJWT, isAdmin);

router.get("/dashboard", getDashboardMetrics);

// Specific order routes first
router.get("/orders/stats", getOrderStats);

// Exchanges admin routes
router.get("/exchanges", getAllExchangesAdmin);
router.put("/exchanges/:id/status", updateExchangeStatusAdmin);

// List and detail orders
router.get("/orders", getAllOrdersAdmin);
router.get("/orders/:id", getOrderByIdAdmin);
router.put("/orders/:id/status", orderStatusUpdateValidator, updateOrderStatus);

// Inventory routes
router.get("/inventory/stats", getInventoryStats);
router.get("/inventory/alerts", getInventoryAlerts);
router.get("/inventory/activity", getInventoryActivity);
router.get("/inventory/analytics", getInventoryAnalytics);
router.post("/inventory/bulk", bulkInventoryActions);
router.get("/inventory", getInventoryList);
router.get("/inventory/:productId", getProductInventoryDetail);
router.put("/inventory/:productId/adjust", adjustProductStock);

// Customer routes
router.get("/customers/stats", getCustomerStats);
router.get("/customers/vip", getVipCustomersAdmin);
router.get("/customers/analytics", getCustomerAnalyticsAdmin);
router.delete("/customers/notes/:noteId", deleteCustomerNoteAdmin);
router.get("/customers/:id/orders", getCustomerOrdersAdmin);
router.get("/customers/:id/timeline", getCustomerTimelineAdmin);
router.get("/customers/:id/notes", getCustomerNotesAdmin);
router.post("/customers/:id/notes", createCustomerNoteAdmin);
router.get("/customers/:id", getCustomerDetailAdmin);
router.delete("/customers/:id", deleteCustomerAdmin);
router.get("/customers", getAllCustomersAdmin);
router.put("/customers/:id/block", toggleBlockUser);

router.get("/analytics/overview", getAnalyticsOverview);
router.get("/analytics/revenue", getAnalyticsRevenue);
router.get("/analytics/funnel", getAnalyticsFunnel);
router.get("/analytics/collections", getAnalyticsCollections);
router.get("/analytics/top-products", getAnalyticsTopProducts);
router.get("/analytics/customers", getAnalyticsCustomers);
router.get("/analytics/geography", getAnalyticsGeography);
router.get("/analytics/channels", getAnalyticsChannels);
router.get("/analytics/inventory", getAnalyticsInventory);
router.get("/analytics/health", getAnalyticsHealth);

router.get("/products/top-selling", getTopSellingProducts);
router.get("/products/performance", getProductPerformance);
router.get("/activity", getBusinessActivity);

router.get("/products", getAllProductsAdmin);
router.get("/analytics", getAnalytics);
router.get("/reports", getReports);

export default router;
