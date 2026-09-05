import MockAdapter from 'axios-mock-adapter';
import api from '../services/api';
import { 
  mockUser, 
  mockQuotes,
  mockProducts, 
  mockRecommendations,
  mockOrderFulfillment,
  mockOrderBilling,
  mockDashboardData,
  mockReportData
} from './mockData';

const mock = new MockAdapter(api, { delayResponse: 300 });

// ── Auth ──
mock.onPost('/auth/login').reply(200, { success: true, data: { token: 'mock-token' } });
mock.onPost('/auth/signup').reply(200, { success: true, data: { message: 'Account created' } });
mock.onGet('/auth/me').reply(200, { success: true, data: mockUser });

// ── Dashboard ──
mock.onGet('/dashboard').reply(200, { success: true, data: mockDashboardData });

// ── Reports ──
mock.onGet('/reports').reply(200, { success: true, data: mockReportData });

// ── Products ──
mock.onGet('/products').reply(200, { success: true, data: mockProducts });

// ── Quotes List ──
mock.onGet('/quotes').reply(200, { 
  success: true, 
  data: mockQuotes,
  meta: { page: 1, limit: 20, total: mockQuotes.length }
});

// ── Single Quote (any ID) ──
mock.onGet(/\/quotes\/[^/]+$/).reply(() => {
  return [200, { success: true, data: mockQuotes[0] }];
});

// ── Recalculate ──
mock.onPost(/\/quotes\/[^/]+\/recalculate/).reply(() => {
  return [200, { success: true, data: mockQuotes[0] }];
});

// ── Recommendations ──
mock.onGet(/\/quotes\/[^/]+\/recommendations/).reply(200, {
  success: true,
  data: mockRecommendations
});

// ── Quote Lines ──
mock.onPost(/\/quotes\/[^/]+\/lines/).reply(() => {
  return [200, { success: true, data: mockQuotes[0] }];
});

// ── Approval Action ──
mock.onPost(/\/quotes\/[^/]+\/approval\/action/).reply(200, {
  success: true,
  data: { success: true }
});

// ── Approval Info ──
mock.onGet(/\/quotes\/[^/]+\/approval/).reply(() => {
  return [200, { success: true, data: mockQuotes[0].approval }];
});

// ── Order Confirm ──
mock.onPost(/\/quotes\/[^/]+\/confirm/).reply(200, {
  success: true,
  data: { id: 'o1', quoteId: 'q1', status: 'CONFIRMED' }
});

// ── Fulfillment ──
mock.onGet(/\/orders\/[^/]+\/fulfillment\/recommendation/).reply(200, {
  success: true,
  data: mockOrderFulfillment
});

mock.onPost(/\/orders\/[^/]+\/fulfillment\/accept/).reply(200, {
  success: true,
  data: { success: true }
});

mock.onPost(/\/orders\/[^/]+\/fulfillment\/consolidate/).reply(200, {
  success: true,
  data: mockOrderFulfillment
});

mock.onPut(/\/orders\/[^/]+\/fulfillment/).reply(200, {
  success: true,
  data: mockOrderFulfillment
});

// ── Billing ──
mock.onGet(/\/orders\/[^/]+\/billing/).reply(200, {
  success: true,
  data: mockOrderBilling
});

mock.onGet(/\/orders\/[^/]+\/invoice/).reply(200, {
  success: true,
  data: { id: 'inv1', orderId: 'o1', total: 197400, status: 'PENDING' }
});

mock.onPost(/\/orders\/[^/]+\/payment/).reply(200, {
  success: true,
  data: { id: 'pay1', amount: 197400, status: 'PAID' }
});

// ── Customer Portal ──
mock.onGet(/\/portal\/quotes\/[^/]+$/).reply(200, {
  success: true,
  data: {
    ...mockQuotes[0],
    marginAmount: undefined,
    marginPercent: undefined,
    discountRiskScore: undefined,
    approval: undefined,
  }
});

mock.onPost(/\/portal\/quotes\/[^/]+\/negotiations/).reply(200, {
  success: true,
  data: {
    message: 'Your negotiation request has been submitted.',
    newStatus: 'UNDER_NEGOTIATION',
    approvalRequired: true,
  }
});

mock.onPost(/\/portal\/quotes\/[^/]+\/confirm/).reply(200, {
  success: true,
  data: {
    message: 'Quotation confirmed successfully.',
    newStatus: 'CONFIRMED',
  }
});

export default mock;
