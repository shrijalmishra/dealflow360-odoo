const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./modules/auth/routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);

// As each module gets built out, mount it here, e.g.:
// app.use("/api/customers", require("./modules/customers/routes"));
// app.use("/api/products", require("./modules/products/routes"));
// app.use("/api/quotations", require("./modules/quotations/routes"));
// app.use("/api/approvals", require("./modules/approvals/routes"));
// app.use("/api/warehouses", require("./modules/warehouses/routes"));
// app.use("/api/fulfillment", require("./modules/fulfillment/routes"));
// app.use("/api/billing", require("./modules/billing/routes"));
// app.use("/api/negotiation", require("./modules/negotiation/routes"));
// app.use("/api/deal-health", require("./modules/dealHealth/routes"));
// app.use("/api/reporting", require("./modules/reporting/routes"));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
