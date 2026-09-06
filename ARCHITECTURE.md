# DealFlow360 — Architecture & System Design

DealFlow360 is an enterprise-grade Sales Operations and Governance Engine designed to automate and enforce business rules across the quote-to-cash lifecycle.

---

## 1. High-Level System Architecture

The system is decoupled into an Express/Node.js REST API layer with Prisma ORM and SQLite/PostgreSQL persistence, coupled with a React 19 single-page client built on Tailwind CSS and a Monochrome Editorial design system.

```mermaid
graph TD
  subgraph Client_Tier["Client Tier (React 19 + Tailwind CSS)"]
    UI_Internal["Internal Web Console<br/>(Sales Rep, Sales Mgr, Finance Ops, Admin)"]
    UI_Portal["Customer Portal<br/>(Restricted Token Authentication)"]
  end

  subgraph Gateway_Tier["API Gateway & Middleware Layer (Express)"]
    MW_Auth["Authentication & JWT Claims<br/>(Internal User vs Customer Portal)"]
    MW_RBAC["Role-Based Access Control (RBAC)<br/>(REP, MANAGER, FINANCE, ADMIN)"]
    MW_Audit["Audit Log Interceptor<br/>(Immutable Change Tracking)"]
  end

  subgraph Engine_Tier["Core Domain Service Engines"]
    MOD_Prod["Products & Price Lists Engine<br/>(Tier Overrides, Variants, Margin Calc)"]
    MOD_Quote["Quotation & Versioning Core<br/>(Immutable Snapshotting, Calculations)"]
    MOD_Risk["Discount Risk & Governance<br/>(Line Excess, Blended Risk, Ceilings)"]
    MOD_Appr["Multi-Step Approval Workflow<br/>(State Machine, Chain of Command)"]
    MOD_Fulfill["Fulfillment & Inventory Engine<br/>(Multi-Warehouse Split, Backorders)"]
    MOD_Bill["Hybrid Billing & Subscriptions<br/>(One-Time, Recurring, Proration)"]
    MOD_Negot["Customer Negotiation Gateway<br/>(Counter-Offers, Auto-Reapproval)"]
    MOD_Health["Deal Health & Anomaly Detector<br/>(Stall Detection, Margin Alerting)"]
    MOD_Report["Reporting & Export Engine<br/>(CSV, XLS, PDF Exporters)"]
  end

  subgraph Persistence_Tier["Persistence & Data Layer"]
    DB[(Relational DB / Prisma ORM)]
    SeedData[(Pre-Loaded Fixtures & Scenarios)]
  end

  UI_Internal --> MW_Auth
  UI_Portal --> MW_Auth
  MW_Auth --> MW_RBAC
  MW_RBAC --> MW_Audit

  MW_Audit --> MOD_Quote
  MW_Audit --> MOD_Prod
  MW_Audit --> MOD_Risk
  MW_Audit --> MOD_Appr
  MW_Audit --> MOD_Fulfill
  MW_Audit --> MOD_Bill
  MW_Audit --> MOD_Negot
  MW_Audit --> MOD_Health
  MW_Audit --> MOD_Report

  MOD_Quote <--> DB
  MOD_Risk <--> DB
  MOD_Appr <--> DB
  MOD_Fulfill <--> DB
  MOD_Bill <--> DB
  MOD_Negot <--> DB
  MOD_Health <--> DB
  MOD_Report <--> DB
```

---

## 2. Relational Data Model (Entity Relationship)

```mermaid
erDiagram
    User ||--o{ Quotation : "owns (rep)"
    User ||--o{ ApprovalDecision : "makes"
    User ||--o{ Customer : "assigned rep"
    Customer ||--o{ CustomerPortalUser : "access"
    CustomerTier ||--o{ Customer : "categorizes"
    Customer ||--o{ Quotation : "receives"
    Customer ||--o{ PriceListEntry : "custom pricing"

    ProductCategory ||--o{ Product : "classifies"
    Product ||--o{ ProductVariant : "has variants"
    Product ||--o{ WarehouseInventory : "stock in"
    Product ||--o{ PriceListEntry : "overridden in"
    Product ||--o{ QuotationLine : "quoted in"
    Product ||--o{ SubscriptionPlan : "recurring setup"

    Warehouse ||--o{ WarehouseInventory : "holds"
    Warehouse ||--o{ FulfillmentAllocation : "ships from"

    Quotation ||--|{ QuotationVersion : "versions (1..N)"
    QuotationVersion ||--|{ QuotationLine : "contains"
    QuotationVersion ||--o| RiskAssessment : "evaluated by"
    QuotationVersion ||--o| ApprovalRequest : "routes through"
    ApprovalRequest ||--o{ ApprovalDecision : "receives"

    Quotation ||--o{ Fulfillment : "dispatches"
    Fulfillment ||--o{ FulfillmentAllocation : "splits"
    Fulfillment ||--o{ Backorder : "logs deficit"

    Quotation ||--o{ Invoice : "bills"
    Invoice ||--o{ InvoiceLine : "items"
    Invoice ||--o{ Payment : "settled with"

    Quotation ||--o{ Subscription : "initiates"
    SubscriptionPlan ||--o{ Subscription : "governs"
    Subscription ||--o{ BillingSchedule : "schedules"
    Subscription ||--o{ CreditNote : "adjusts"

    Quotation ||--o{ NegotiationEvent : "records interactions"
    Quotation ||--o{ DealAlert : "monitored by"
```

---

## 3. Key Architectural Decisions

### 1. Immutable Quotation Versioning (`QuotationVersion`)
Risk, approvals, and line-item snapshots are pinned to a `QuotationVersion` rather than the mutable `Quotation` parent entity. When a customer or sales rep amends a quote after approval, a new version is created. This guarantees that an approval cannot be silently inherited by modified commercial terms.

### 2. Isolated Customer Portal Security
`CustomerPortalUser` is isolated from the internal `User` model, featuring distinct password hashes, strict customer-scoped data access, and dedicated JWT secrets. A customer portal token cannot invoke internal administrative endpoints.

### 3. Separation of Risk Assessment & Approval State
The `RiskAssessment` engine evaluates mathematical discount excess and blended risk as a pure, deterministic function. The `ApprovalRequest` handles the state machine (Pending, Approved, Rejected, Revision Required) across multiple stakeholders. This separation ensures risk can be recalculated on-the-fly without corrupting in-flight approval chains.

### 4. Heuristic Multi-Warehouse Fulfillment
The fulfillment engine dynamically evaluates inventory across warehouses, applying location proximity and shipping cost weightings (`shippingCostWeight`) to minimize the total number of shipments and logistics overhead. If stock is insufficient, backorders are generated automatically.

### 5. Dual-Stream Hybrid Billing
A single quotation can cleanly bridge one-time capital purchases and ongoing subscription contracts. The billing service routes one-time lines directly to upfront fulfillment invoices, while recurring lines generate subscription plans with customizable proration, cancellation, and scheduled recurring billing cycles.
