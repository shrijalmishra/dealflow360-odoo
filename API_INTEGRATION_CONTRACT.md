# DealFlow360 — API Integration Contract

This document lists every endpoint the frontend expects from the backend.
All URLs are relative to `VITE_API_BASE_URL` (default: `http://localhost:5000/api`).

## Response Format

### Success
```json
{ "success": true, "data": {} }
```

### Success (List)
```json
{ "success": true, "data": [], "meta": { "page": 1, "limit": 20, "total": 100 } }
```

### Error
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

---

## AUTH

| Method | Endpoint        | Body                                 | Response `data`            |
|--------|-----------------|--------------------------------------|----------------------------|
| POST   | /auth/signup    | `{ name, email, password, role }`    | `{ message }`              |
| POST   | /auth/login     | `{ email, password }`                | `{ token }`                |
| GET    | /auth/me        | —                                    | `User` object              |

---

## PRODUCTS

| Method | Endpoint         | Body                    | Response `data`      |
|--------|------------------|-------------------------|----------------------|
| GET    | /products        | —                       | `Product[]`          |
| GET    | /products/:id    | —                       | `Product`            |
| POST   | /products        | `Product` payload       | `Product`            |
| PUT    | /products/:id    | `Product` payload       | `Product`            |
| DELETE | /products/:id    | —                       | `{ message }`        |

---

## CUSTOMERS

| Method | Endpoint          | Body                | Response `data`     |
|--------|-------------------|---------------------|---------------------|
| GET    | /customers        | —                   | `Customer[]`        |
| GET    | /customers/:id    | —                   | `Customer`          |
| POST   | /customers        | `Customer` payload  | `Customer`          |

---

## QUOTES

| Method | Endpoint                       | Body                  | Response `data`             |
|--------|--------------------------------|-----------------------|-----------------------------|
| GET    | /quotes                        | —                     | `Quote[]` + `meta`          |
| POST   | /quotes                        | `Quote` payload       | `Quote`                     |
| GET    | /quotes/:id                    | —                     | `Quote` (with `lines`, `approval`) |
| PUT    | /quotes/:id                    | `Quote` payload       | `Quote`                     |
| DELETE | /quotes/:id                    | —                     | `{ message }`               |
| POST   | /quotes/:id/lines              | `QuoteLine` payload   | `Quote` (updated)           |
| PUT    | /quotes/:id/lines/:lineId      | `QuoteLine` payload   | `Quote` (updated)           |
| DELETE | /quotes/:id/lines/:lineId      | —                     | `Quote` (updated)           |
| POST   | /quotes/:id/recalculate        | `{ lines }` array     | `Quote` (recalculated, authoritative totals) |

### Quote Object (expected fields)
```
id, quoteNumber, customerId, customerName, status, created, updated,
assignedRep, subtotal, discountTotal, taxTotal, grandTotal,
marginAmount, marginPercent, discountRiskScore,
approval: { status, requiredLevel, steps[] },
lines: QuoteLine[]
```

### QuoteLine Object
```
id, productId, productName, type, quantity, unitPrice,
discountPercent, discountAmount, tax, lineTotal, margin
```

---

## RECOMMENDATIONS (Upsell/Cross-sell)

| Method | Endpoint                        | Response `data`              |
|--------|---------------------------------|------------------------------|
| GET    | /quotes/:id/recommendations     | `Recommendation[]`           |

### Recommendation Object
```
productId, productName, reason, marginDelta, promotion, score
```

---

## APPROVAL

| Method | Endpoint                        | Body                          | Response `data`     |
|--------|---------------------------------|-------------------------------|---------------------|
| GET    | /approvals                      | —                             | `Quote[]` (pending) |
| GET    | /quotes/:id/approval            | —                             | `ApprovalSummary`   |
| POST   | /quotes/:id/approval/action     | `{ action, reason }`          | `{ success }`       |

Action values: `APPROVE`, `REJECT`, `RETURN`

---

## ORDER

| Method | Endpoint                | Body | Response `data` |
|--------|-------------------------|------|-----------------|
| POST   | /quotes/:id/confirm     | —    | `Order`         |

---

## FULFILLMENT

| Method | Endpoint                                  | Body          | Response `data`         |
|--------|-------------------------------------------|---------------|-------------------------|
| GET    | /orders/:id/fulfillment/recommendation    | —             | `FulfillmentSummary`    |
| POST   | /orders/:id/fulfillment/accept            | `{ split }`   | `{ success }`           |
| PUT    | /orders/:id/fulfillment                   | override data | `FulfillmentSummary`    |
| POST   | /orders/:id/fulfillment/consolidate       | —             | `FulfillmentSummary`    |

### FulfillmentSummary
```
id, quoteId, split: [{ warehouse, quantity, shippingCost, status }],
shipmentCount, totalShippingCost, backorderQuantity
```

---

## BILLING

| Method | Endpoint                  | Body              | Response `data`       |
|--------|---------------------------|--------------------|-----------------------|
| GET    | /orders/:id/billing       | —                  | `BillingSummary`      |
| GET    | /orders/:id/invoice       | —                  | `Invoice`             |
| POST   | /orders/:id/payment       | `{ amount }`       | `Payment`             |
| GET    | /orders/:id/payments      | —                  | `Payment[]`           |

### BillingSummary
```
id, quoteId,
oneTime: [{ product, quantity, amount, billingDate, status }],
recurring: [{ product, quantity, amount, billingDate, status }],
total, paid, remaining, invoiceStatus
```

---

## SUBSCRIPTIONS

| Method | Endpoint                  | Body                  | Response `data`       |
|--------|---------------------------|-----------------------|-----------------------|
| GET    | /subscription-plans       | —                     | `SubscriptionPlan[]`  |
| POST   | /subscription-plans       | plan payload          | `SubscriptionPlan`    |
| PUT    | /subscription-plans/:id   | plan payload          | `SubscriptionPlan`    |

---

## CUSTOMER PORTAL

| Method | Endpoint                              | Body                                          | Response `data`                            |
|--------|---------------------------------------|-----------------------------------------------|--------------------------------------------|
| GET    | /portal/quotes/:token                 | —                                             | `Quote` (stripped of internal fields)      |
| POST   | /portal/quotes/:token/negotiations    | `{ lineComments, changeRequest, counterDiscount }` | `{ message, newStatus, approvalRequired }` |
| POST   | /portal/quotes/:token/confirm         | —                                             | `{ message, newStatus }`                   |

---

## DASHBOARD

| Method | Endpoint    | Response `data`                                                        |
|--------|-------------|------------------------------------------------------------------------|
| GET    | /dashboard  | `{ totalQuotations, pendingApprovals, atRiskDeals, revenue, outstandingPayments, fulfillmentIssues, stalledDeals[], discountAnomalies[], deliverySlippage[] }` |

---

## REPORTS

| Method | Endpoint  | Query Params                              | Response `data`                                          |
|--------|-----------|-------------------------------------------|----------------------------------------------------------|
| GET    | /reports  | `period, rep, approvalStatus, category`   | `{ quotationCount, orderCount, revenue, averageDiscount, approvalStats, topProducts[] }` |

---

## ENUMS (Shared Constants)

| Enum              | Values |
|-------------------|--------|
| User Roles        | `SALES_REP, SALES_MANAGER, FINANCE, OPERATIONS, CUSTOMER, ADMIN` |
| Quote Status      | `DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, SENT, UNDER_NEGOTIATION, CONFIRMED, FULFILLMENT, PARTIALLY_FULFILLED, FULFILLED, CANCELLED` |
| Approval Status   | `NOT_REQUIRED, PENDING, APPROVED, REJECTED, RETURNED` |
| Product Type      | `ONE_TIME, SUBSCRIPTION` |
| Fulfillment Status| `PENDING, ALLOCATED, PARTIALLY_ALLOCATED, BACKORDERED, FULFILLED` |
| Billing Status    | `PENDING, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED` |
