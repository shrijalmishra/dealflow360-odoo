const express = require("express");

const cors = require("cors");

const morgan = require("morgan");

const authRoutes = require("./modules/auth/routes");

const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorHandler");

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  morgan(
    process.env.NODE_ENV === "development"
      ? "dev"
      : "combined"
  )
);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

// Authentication
app.use(
  "/api/auth",
  authRoutes
);

// Products
app.use(
  "/api/products",
  require("./modules/products/routes")
);

// Price Lists
app.use(
  "/api/price-lists",
  require("./modules/products/priceListRoutes")
);

// Customers
app.use(
  "/api/customers",
  require("./modules/customers/routes")
);

// Quotations
app.use(
  "/api/quotations",
  require("./modules/quotations/routes")
);

// Discount Risk
app.use(
  "/api/discount-risk",
  require("./modules/discountRisk/routes")
);

// Approvals
app.use(
  "/api/approvals",
  require("./modules/approvals/routes")
);

// Warehouses
app.use(
  "/api/warehouses",
  require("./modules/warehouses/routes")
);

// Billing
app.use(
  "/api/billing",
  require("./modules/billing/routes")
);

// Subscriptions
app.use(
  "/api/subscriptions",
  require("./modules/subscriptions/routes")
);

// Customer Portal
app.use(
  "/api/portal",
  require("./modules/customerPortal/routes")
);

// Negotiation (Internal)
app.use(
  "/api/negotiation",
  require("./modules/negotiation/routes")
);

// Recommendations (Upsell & Cross-sell)
app.use(
  "/api/recommendations",
  require("./modules/recommendations/routes")
);

// Deal Health & Anomaly Detection
app.use(
  "/api/deal-health",
  require("./modules/dealHealth/routes")
);

// Reporting & Analytics
app.use(
  "/api/reporting",
  require("./modules/reporting/routes")
);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;