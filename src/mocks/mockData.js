import { 
  QUOTE_STATUS, 
  APPROVAL_STATUS, 
  PRODUCT_TYPE,
  FULFILLMENT_STATUS,
  BILLING_STATUS,
  USER_ROLES
} from '../constants/enums';

// Users
export const mockUsers = {
  'sarah@dealflow360.com': { id: 'u1', name: 'Sarah Sales', role: USER_ROLES.SALES_REP, email: 'sarah@dealflow360.com' },
  'manager@dealflow360.com': { id: 'u2', name: 'Michael Manager', role: USER_ROLES.SALES_MANAGER, email: 'manager@dealflow360.com' },
  'finance@dealflow360.com': { id: 'u3', name: 'Fiona Finance', role: USER_ROLES.FINANCE, email: 'finance@dealflow360.com' },
  'admin@dealflow360.com': { id: 'u4', name: 'Alice Admin', role: USER_ROLES.ADMIN, email: 'admin@dealflow360.com' }
};

export const mockUser = mockUsers['sarah@dealflow360.com'];

// Customers
export const mockCustomers = [
  { id: 'c1', name: 'Acme Corp', tier: 'GOLD', email: 'purchasing@acmecorp.com' },
];

// Products
export const mockProducts = [
  { id: 'p1', name: 'Laptop', type: PRODUCT_TYPE.ONE_TIME, price: 100000, margin: 25000 },
  { id: 'p2', name: 'Setup Service', type: PRODUCT_TYPE.ONE_TIME, price: 20000, margin: 15000 },
  { id: 'p3', name: 'Cloud Pro', type: PRODUCT_TYPE.SUBSCRIPTION, price: 5000, margin: 4000 },
  { id: 'p4', name: 'Laptop Stand', type: PRODUCT_TYPE.ONE_TIME, price: 5000, margin: 3000 }
];

// Quotes - Canonical Demo
export const mockQuotes = [
  {
    id: 'q1',
    quoteNumber: 'Q-1001',
    customerId: 'c1',
    customerName: 'Acme Corp',
    status: QUOTE_STATUS.PENDING_APPROVAL,
    created: '2026-09-05T10:00:00Z',
    updated: '2026-09-05T10:30:00Z',
    assignedRep: 'Sarah Sales',
    subtotal: 225000,
    discountTotal: 27600, 
    taxTotal: 35532,
    grandTotal: 232932,
    marginAmount: 51400,
    marginPercent: 26,
    discountRiskScore: 72,
    approval: {
      status: APPROVAL_STATUS.PENDING,
      requiredLevel: USER_ROLES.SALES_MANAGER,
      steps: [
        {
          role: USER_ROLES.SALES_MANAGER,
          status: APPROVAL_STATUS.PENDING,
          reviewer: null,
          date: null,
          reason: null
        }
      ]
    },
    lines: [
      {
        id: 'ql1',
        productId: 'p1',
        productName: 'Laptop',
        type: PRODUCT_TYPE.ONE_TIME,
        quantity: 2,
        unitPrice: 100000,
        discountPercent: 12,
        discountAmount: 24000,
        tax: 31680,
        lineTotal: 176000,
        margin: 26000
      },
      {
        id: 'ql2',
        productId: 'p2',
        productName: 'Setup Service',
        type: PRODUCT_TYPE.ONE_TIME,
        quantity: 1,
        unitPrice: 20000,
        discountPercent: 18,
        discountAmount: 3600,
        tax: 2952,
        lineTotal: 16400,
        margin: 11400
      },
      {
        id: 'ql3',
        productId: 'p3',
        productName: 'Cloud Pro',
        type: PRODUCT_TYPE.SUBSCRIPTION,
        quantity: 1,
        unitPrice: 5000,
        discountPercent: 0,
        discountAmount: 0,
        tax: 900,
        lineTotal: 5000,
        margin: 4000
      }
    ]
  }
];

export const mockRecommendations = [
  {
    productId: 'p4',
    productName: 'Laptop Stand',
    reason: 'Bought by 85% of customers purchasing Laptops',
    marginDelta: 3000,
    promotion: '20% OFF ATTACH RATE',
    score: 95
  }
];

export const mockOrderFulfillment = {
  id: 'o1',
  quoteId: 'q1',
  split: [
    { warehouse: 'East Coast Hub', quantity: 2, shippingCost: 450, status: FULFILLMENT_STATUS.ALLOCATED },
    { warehouse: 'West Coast Hub (Backorder)', quantity: 1, shippingCost: 0, status: FULFILLMENT_STATUS.BACKORDERED }
  ],
  shipmentCount: 2,
  totalShippingCost: 450,
  backorderQuantity: 1
};

export const mockOrderBilling = {
  id: 'o1',
  quoteId: 'q1',
  oneTime: [
    { product: 'Laptop', quantity: 2, amount: 176000, billingDate: '2026-09-05T10:00:00Z', status: BILLING_STATUS.PENDING },
    { product: 'Setup Service', quantity: 1, amount: 16400, billingDate: '2026-09-05T10:00:00Z', status: BILLING_STATUS.PENDING }
  ],
  recurring: [
    { product: 'Cloud Pro', quantity: 1, amount: 5000, billingDate: '2026-10-05T10:00:00Z', status: BILLING_STATUS.PENDING }
  ],
  total: 197400,
  paid: 0,
  remaining: 197400,
  invoiceStatus: BILLING_STATUS.PENDING
};

export const mockDashboardData = {
  totalQuotations: 14,
  pendingApprovals: 3,
  atRiskDeals: 2,
  revenue: 1250000,
  outstandingPayments: 450000,
  fulfillmentIssues: 1,
  stalledDeals: [
    { quoteNumber: 'Q-0995', customer: 'Beta Industries', inactivity: '5 days', amount: 120000, status: QUOTE_STATUS.UNDER_NEGOTIATION }
  ],
  discountAnomalies: [
    { quoteNumber: 'Q-1001', rep: 'Sarah Sales', discount: '18%', historicalAverage: '10%', severity: 'HIGH' }
  ],
  deliverySlippage: [
    { orderId: 'O-0980', expected: '2026-09-01T00:00:00Z', actualStatus: 'Delayed - Customs' }
  ]
};

export const mockReportData = {
  quotationCount: 14,
  orderCount: 8,
  revenue: 1250000,
  averageDiscount: 12.3,
  approvalStats: {
    approved: 9,
    rejected: 2,
    pending: 3,
    returned: 1,
  },
  topProducts: [
    { name: 'Laptop', unitsSold: 24, revenue: 2400000 },
    { name: 'Cloud Pro', unitsSold: 18, revenue: 90000 },
    { name: 'Setup Service', unitsSold: 15, revenue: 300000 },
    { name: 'Laptop Stand', unitsSold: 12, revenue: 60000 },
  ],
};
