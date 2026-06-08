import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Nostlable E-Commerce API",
      version: "1.0.0",
      description:
        "Production-ready backend API documentation for Nostlable clothing e-commerce brand.",
      contact: {
        name: "Nostlable Support",
        email: "support@nostlable.com",
      },
    },
    servers: [
      {
        url: "http://localhost:5005/api",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT Access Token to access protected endpoints.",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            emailVerified: { type: "boolean" },
            role: { type: "string", enum: ["CUSTOMER", "ADMIN"] },
            isBlocked: { type: "boolean" },
            profileImage: { type: "string" },
            addresses: { type: "array", items: { $ref: "#/components/schemas/Address" } },
            wishlist: { type: "array", items: { type: "string" } },
            cart: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
          },
        },
        Address: {
          type: "object",
          required: ["fullName", "phone", "addressLine1", "city", "state", "postalCode"],
          properties: {
            _id: { type: "string" },
            fullName: { type: "string" },
            phone: { type: "string" },
            addressLine1: { type: "string" },
            addressLine2: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            country: { type: "string", default: "India" },
            postalCode: { type: "string" },
            isDefault: { type: "boolean" },
          },
        },
        CartItem: {
          type: "object",
          properties: {
            product: { type: "string", description: "Product ID" },
            size: { type: "string", enum: ["S", "M", "L", "XL", "XXL"] },
            color: { type: "string" },
            quantity: { type: "number", minimum: 1 },
            price: { type: "number" },
          },
        },
        Product: {
          type: "object",
          required: ["name", "description", "category", "price"],
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            brand: { type: "string" },
            category: { type: "string", description: "Category ID" },
            price: { type: "number" },
            discountPrice: { type: "number" },
            stock: { type: "number" },
            sizes: { type: "array", items: { type: "string" } },
            colors: { type: "array", items: { type: "string" } },
            images: { type: "array", items: { type: "string" } },
            featured: { type: "boolean" },
            bestseller: { type: "boolean" },
            newArrival: { type: "boolean" },
            rating: { type: "number" },
            reviewCount: { type: "number" },
            status: { type: "string", enum: ["ACTIVE", "DRAFT", "OUT_OF_STOCK"] },
            variants: { type: "array", items: { $ref: "#/components/schemas/ProductVariant" } },
          },
        },
        ProductVariant: {
          type: "object",
          required: ["size", "color", "stock", "sku"],
          properties: {
            size: { type: "string", enum: ["S", "M", "L", "XL", "XXL"] },
            color: { type: "string" },
            stock: { type: "number" },
            sku: { type: "string" },
          },
        },
        Category: {
          type: "object",
          required: ["name"],
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            image: { type: "string" },
            status: { type: "string", enum: ["ACTIVE", "DRAFT"] },
          },
        },
        Coupon: {
          type: "object",
          required: ["code", "discountType", "discountValue", "expiryDate"],
          properties: {
            _id: { type: "string" },
            code: { type: "string" },
            discountType: { type: "string", enum: ["PERCENTAGE", "FIXED"] },
            discountValue: { type: "number" },
            minimumOrderValue: { type: "number" },
            usageLimit: { type: "number" },
            usedCount: { type: "number" },
            expiryDate: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: { type: "string" },
            customer: { type: "string", description: "Customer ID" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: { type: "string" },
                  name: { type: "string" },
                  size: { type: "string" },
                  color: { type: "string" },
                  quantity: { type: "number" },
                  price: { type: "number" },
                },
              },
            },
            shippingAddress: { $ref: "#/components/schemas/Address" },
            paymentMethod: { type: "string", enum: ["RAZORPAY", "COD"] },
            paymentStatus: { type: "string", enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"] },
            orderStatus: { type: "string", enum: ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] },
            subtotal: { type: "number" },
            discount: { type: "number" },
            shippingCharge: { type: "number" },
            tax: { type: "number" },
            totalAmount: { type: "number" },
            trackingId: { type: "string" },
            awbNumber: { type: "string" },
            courierName: { type: "string" },
            notes: { type: "string" },
          },
        },
        Review: {
          type: "object",
          properties: {
            _id: { type: "string" },
            product: { type: "string" },
            user: { type: "string" },
            rating: { type: "number" },
            comment: { type: "string" },
          },
        },
      },
    },
  },
  // Path to scan for swagger annotations JSDocs (we will document controllers/routes if needed, or Swagger JSON is generated based on schemas)
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
