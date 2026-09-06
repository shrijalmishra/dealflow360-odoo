# DealFlow360 — 5-Minute Live Demo Guide

This demo script demonstrates the full quote-to-cash workflow, automated discount governance, customer negotiation loop, split-warehouse fulfillment, and hybrid billing.

---

## Pre-Requisites & Credentials

Ensure backend and frontend servers are running:
* **Backend**: `http://localhost:4000` (API status: `http://localhost:4000/health`)
* **Frontend**: `http://localhost:5173`

### Pre-Configured Test Accounts

| Role | Email | Password | Primary Duties |
| :--- | :--- | :--- | :--- |
| **Sales Rep** | `rep@dealflow360.test` | `Rep@12345` | Build quotes, initiate discounts, view recommendations |
| **Sales Manager** | `manager@dealflow360.test` | `Manager@12345` | Approve tier/category threshold breaches |
| **Finance Ops** | `finance@dealflow360.test` | `Finance@12345` | Blended risk approvals, invoicing, payment recording |
| **Admin** | `admin@dealflow360.test` | `Admin@12345` | Full access, settings, warehouse & product management |
| **Customer Portal** | `acme@dealflow360.test` | `Customer@12345` | Portal quotation review, counter-discounts, confirmation |

---

## Flow 1: High-Discount Quote → Risk Assessment → Approvals → Fulfillment → Billing (3 Minutes)

### Step 1: Create a Quotation with High Discount (Sales Rep)
1. Log in as **Sales Rep** (`rep@dealflow360.test`).
2. Navigate to **02. Quotation Core → New Quote** (`/quotes/new`).
3. Select **Acme Corp** (Bronze Tier, ceiling 5%).
4. Add Line 1: **Enterprise Server X1** (Hardware, ceiling 15%), Qty: `10`, Discount: `25%` (violates both Bronze 5% and Hardware 15% ceilings).
5. Add Line 2: **Cloud Analytics Suite** (Subscription), Qty: `1`, Billing: `MONTHLY`.
6. Notice the intelligent **Upsell & Cross-Sell Recommendations** drawer appearing on the right proposing "24/7 Enterprise Support". Click **Add to Quote**.
7. Click **Recalculate**: The system evaluates risk and displays:
   * **Worst Line Excess**: `10%` over ceiling
   * **Risk Level**: `HIGH`
   * **Required Approval**: `Sales Manager + Finance Ops`
8. Click **Submit for Approval**. Quote transitions to `PENDING_MANAGER_APPROVAL`.

### Step 2: Sales Manager Approval
1. Log out and log in as **Sales Manager** (`manager@dealflow360.test`).
2. Navigate to **03. Governance & Risk → Pending Approvals** (`/approvals`).
3. Locate the newly submitted quotation. Click to open details.
4. Review the excess discount breakdown and risk telemetry.
5. Enter comment: *"Approved for Q3 enterprise volume commitment."* Click **Approve**.
6. Because the risk score is HIGH, the quote advances to `PENDING_FINANCE_APPROVAL`.

### Step 3: Finance Ops Approval
1. Log in as **Finance Ops** (`finance@dealflow360.test`).
2. Navigate to **03. Governance & Risk → Finance Queue** (`/finance-approvals`).
3. Review margin impact and payment schedules. Click **Approve**.
4. Quote transitions to `APPROVED` and is automatically ready for sending to customer.

### Step 4: Multi-Warehouse Fulfillment
1. Navigate to **04. Logistics & Operations → Fulfillment** (`/fulfillment`).
2. Notice the quotation has generated a fulfillment plan:
   * 6 units allocated from **Warehouse North (Bangalore)**
   * 4 units allocated from **Warehouse South (Chennai)**
   * Estimated freight cost calculated based on warehouse shipping cost weighting.
3. Click **Dispatch Shipment** to confirm allocation. Stock levels decrease in real time.

### Step 5: Dual-Stream Invoicing & Payment
1. Navigate to **05. Subscriptions & Billing → Invoices** (`/billing`).
2. Inspect the generated invoices:
   * One-Time Invoice: For the hardware servers and upfront support.
   * Recurring Subscription Schedule: Scheduled monthly billing cycle for Cloud Analytics.
3. Click **Record Payment** on the one-time invoice. Enter method *"Wire Transfer"* and submit.
4. Status changes to `PAID`.

---

## Flow 2: Customer Portal Negotiation & Auto-Reapproval Loop (2 Minutes)

### Step 1: Customer Receives and Reviews Quote
1. Open an incognito tab or log out, then navigate to **Customer Portal Login** (`/customer/login`).
2. Log in as `acme@dealflow360.test` / `Customer@12345`.
3. View the customer dashboard and select the active quotation.

### Step 2: Customer Counters with Lower Price (Triggering Governance)
1. Customer reviews the proposed terms and counter-proposes a higher discount of `30%` on the line items.
2. In the negotiation remarks box, type: *"Requesting 30% discount to finalize our board purchase order this week."*
3. Click **Submit Counter-Offer**.
4. **Governance Enforcement**: The system immediately detects that the counter-offer exceeds approved limits:
   * Quote status automatically updates to `APPROVAL_REQUIRED_AGAIN`.
   * An immutable `NegotiationEvent` is logged in the audit trail.
   * Internal deal health monitors trigger a `NEGOTIATION_DELAY` / anomaly warning.

### Step 3: Manager Concurrence & Final Confirmation
1. In the internal browser window, log in as **Sales Manager** (`manager@dealflow360.test`).
2. Navigate to `/approvals`. The renegotiated quotation is visibly badged `Re-Approval Required`.
3. Click to view the customer's comment and counter-discount. Click **Approve Revision**.
4. Back in the Customer Portal window, refresh or view quotation status: it now indicates **Approved by Sales Team**.
5. Customer clicks **Confirm Quotation** (`CUSTOMER_CONFIRMED`).
6. The quotation automatically converts into an official sales order ready for fulfillment and billing.

---

## 3. Configuration & Administration Showcase

To demonstrate administrative configurability to evaluators:
* **Product Catalog & Variant Management**: Navigate to `/products` to create products, define variants (RAM, CPU), and assign tier-specific price overrides.
* **Discount Ceilings & Approval Chains**: Navigate to `/settings` under Governance to adjust Bronze/Silver/Gold ceilings and category rules dynamically.
* **Executive Reports**: Navigate to `/reports` to filter by sales team, date range, or deal status, and click **PDF** or **XLS** to trigger live report downloads.
