# Nostlable E-Commerce Backend

A production-ready, enterprise-grade backend for **Nostlable**—a premium clothing brand built using Node.js, Express, and MongoDB.

---

## Technical Stack
- **Runtime**: Node.js (ES6+ Modules)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Security**: Helmet, CORS, Rate Limiting, Mongo Sanitization, XSS protection, Bcrypt hashing
- **Authentication**: JWT Access Token (expires in 15m) + JWT Refresh Token (stored in DB & secure httpOnly cookie)
- **Payment Gateway**: Razorpay (signature checks, webhooks, refund capabilities)
- **Logistics Integration**: Shiprocket Mock Architecture (awb generation, shipment creation, tracking)
- **Image Storage**: Cloudinary (integrated with Multer parsing)
- **Real-Time updates**: Socket.io (notifies admins on orders, clients on order status updates)
- **Documentation**: Swagger UI Docs (available at `/api-docs`)

---

## Directory Structure
```text
src/
├── config/         # Database, Cloudinary, Razorpay, Redis, Socket configs
├── controllers/    # Express controllers (auth, cart, products, orders, payments, admin)
├── models/         # Mongoose models (User, Product, Category, Coupon, Order, InventoryLog, Review)
├── routes/         # Router mounting definitions
├── middlewares/    # Authentication, centralized error handling, uploads, rate limiters
├── services/       # Cloudinary upload, Razorpay, Shiprocket integration, Inventory transaction logs
├── validators/     # Express-validator input validation schemas
├── utils/          # Standard response/error handlers, pagination, helper wrappers
├── scripts/        # Seeding and mock test scripts
├── uploads/        # Temporary disk storage directory
├── app.js          # Express app configurations
└── server.js        # Server entry listener & process event traps
```

---

## Setup Instructions

1. **Environment Variables**:
   Copy `.env.example` to `.env` and configure your credentials. Note that email dispatch is powered by **Resend API**. You should sign up at [Resend](https://resend.com) to generate a free API key and add it as `RESEND_API_KEY` (or use `mock` for local dev terminal testing):
   ```bash
   cp .env.example .env
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Seed Database**:
   Populate initial clothing categories, the launch T-shirt with multiple variants (sizes S-XXL, colors Black/White/Blue/Red), and the `LAUNCH20` coupon:
   ```bash
   npm run seed
   ```

4. **Run Server locally**:
   - Development mode (uses nodemon):
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

---

## Key Features

### 1. User & Address Flow
- User roles: `CUSTOMER` and `ADMIN`.
- Customers can add, update, delete multiple addresses, and set a default address.
- Block check: Blocked users are immediately logged out (refresh tokens revoked) and denied access.

### 2. Product Variants & Inventory Logs
- Products support variants having distinct `size`, `color`, `stock`, and unique `sku`.
- Base stock of product dynamically updates to the sum of variant stocks.
- **Stock adjustments**: Automatically reduces stock after successful payments and restores stock if orders are cancelled or returned. All adjustments create transactional audit entries in `InventoryLog`.

### 3. Cart & Checkouts
- Cart operations (`add`, `remove`, `update quantity`, `clear`) dynamically look up current prices and stock availability in the database.
- Cart computes `subtotal`, `discount` difference, and `total`.

### 4. Admin Dashboard, Analytics, & Reports
- **Dashboard Metrics**: Fetches today's revenue, weekly/monthly totals, user counts, top products sold, and low stock warnings.
- **Reports Module**: Generates reports aggregated daily, weekly, or monthly, formatted as JSON arrays suitable for charts.

### 5. Razorpay Payments & Webhook Security
- Double validation checks: Payment signature validation on callbacks and webhook listeners (`payment.captured` & `payment.failed`) to ensure orders are completed asynchronously if users close their browser early.

### 6. Shiprocket Logistics Scaffolding
- Built-in wrapper calls: `createShipment()`, `generateAWB()`, `trackShipment()`, and `cancelShipment()`.
- Automatically calls services and logs courier name, tracking ID, and AWB number to the order once order status becomes `SHIPPED`.

### 7. Product Review Verification
- Customers can only review a product if they have purchased it and the order status is `DELIVERED`.
- Mongoose hooks recalculate product average rating and reviews count automatically upon review creation/updates/deletions.

---

## API Endpoints List

Explore full endpoint shapes and run requests directly using Swagger documentation by loading:
`http://localhost:5000/api-docs`
