import { body } from "express-validator";
import { validate } from "./validate.js";

const orderCreateValidator = [
  body("shippingAddressId")
    .notEmpty()
    .withMessage("Shipping Address ID is required")
    .isMongoId()
    .withMessage("Invalid address ID format"),
  body("paymentMethod")
    .optional()
    .isIn(["RAZORPAY", "COD"])
    .withMessage("Payment method must be RAZORPAY or COD"),
  body("couponCode")
    .optional()
    .trim()
    .toUpperCase(),
  body("notes")
    .optional()
    .trim(),
  validate,
];

const orderStatusUpdateValidator = [
  body("orderStatus")
    .notEmpty()
    .withMessage("Order status is required")
    .isIn([
      "PENDING",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ])
    .withMessage("Invalid order status"),
  validate,
];

const courierUpdateValidator = [
  body("courierName")
    .notEmpty()
    .withMessage("Courier name is required")
    .trim(),
  body("trackingId")
    .notEmpty()
    .withMessage("Tracking ID is required")
    .trim(),
  body("awbNumber")
    .notEmpty()
    .withMessage("AWB number is required")
    .trim(),
  validate,
];

export { orderCreateValidator, orderStatusUpdateValidator, courierUpdateValidator };
