# DealFlow360 Backend

Node.js + Express + PostgreSQL (via Prisma) backend for the DealFlow360
sales operations platform.

## Setup

```bash
npm install
cp .env.example .env
# edit .env with your real Postgres connection string and JWT secrets

npx prisma migrate dev --name init   # creates all tables from schema.prisma
npm run prisma:seed                  # baseline tiers, categories, approval rules, admin user, warehouses

npm run dev                          # starts on http://localhost:4000
```

Default admin login after seeding: `admin@dealflow360.test` / `Admin@12345`

## What's implemented so far

- **Prisma schema** (`prisma/schema.prisma`) — the full entity blueprint:
  identity/RBAC, customers/pricing, quotation + versioning, discount
  governance, approval routing, recommendations, warehouses/fulfillment,
  subscriptions/billing, negotiation, deal health, audit log.
- **Auth module** (`src/modules/auth`) — internal user signup/login (JWT),
  separate customer portal login with its own secret and token type, so a
  customer token can never be replayed against internal endpoints.
- **Middleware**:
  - `middleware/auth.js` — `requireAuth` (internal), `requireCustomerAuth` (portal)
  - `middleware/rbac.js` — `requireRole(...)` for per-route permission checks
  - `middleware/errorHandler.js` — central `AppError` + error responses

## Why the schema is shaped this way

- **`Quotation` → `QuotationVersion` is one-to-many.** Risk, approval, and
  negotiation all attach to a specific *version*, not the quotation itself.
  This is what makes "customer negotiates → quote automatically re-enters
  approval" safe: a manager's approval decision is permanently tied to the
  exact terms they saw, so a later edit can never silently inherit an old
  approval.
- **`RiskAssessment` and `ApprovalRequest` are separate models** — risk is a
  pure recalculation, approval is a workflow/state machine. Keeping them
  apart means risk can be recomputed at any time without corrupting an
  in-flight approval.
- **`WarehouseInventory` is a join table**, not a field on `Product`, since
  stock is split across warehouses (the PS's Bangalore/Chennai example) and
  the fulfillment engine needs to query per-warehouse availability.
- **`CustomerPortalUser` is a fully separate model from `User`**, with its
  own JWT secret and token `type` claim, because the PS explicitly requires
  the customer-facing view to be a genuinely separate, restricted surface —
  not an internal screen with a different label.

## Next steps (in build order)

1. **Products & Pricing module** — CRUD for products/categories/variants/price
   lists, plus the "resolve effective price for this customer" logic.
2. **Quotation module** — create/version quotations, add/edit lines,
   recalculate subtotal/discount/tax/margin on every change.
3. **Discount Risk engine** — per-line excess calculation + blended score
   (this is the centerpiece the PS cares most about).
4. **Approval engine** — route by `ApprovalRule`, log every decision via
   `AuditLog`.
5. **Fulfillment engine** — warehouse split optimization + manual override +
   backorders.
6. **Billing/Subscription engine** — one-time invoices, recurring billing
   schedules, proration.
7. **Negotiation module** — customer portal endpoints, re-approval trigger.
8. **Deal Health + Reporting** — last, since they read from everything above.

Each module should follow the existing `auth` module's shape:
`routes.js` (HTTP layer) → `controller.js` (validation via zod) →
`service.js` (business logic + Prisma calls).
