import MockAdapter from 'axios-mock-adapter';
import api from '../services/api';
import { 
  mockUser, 
  mockQuotes,
  mockProducts, 
  mockRecommendations,
  mockOrderFulfillment,
  mockOrderBilling,
  mockDashboardData
} from './mockData';

const mock = new MockAdapter(api, { delayResponse: 500 }); // simulate network delay

// Auth
mock.onPost('/auth/login').reply(200, { success: true, data: { token: 'mock-token' } });
mock.onGet('/auth/me').reply(200, { success: true, data: mockUser });

// Dashboard
mock.onGet('/dashboard').reply(200, { success: true, data: mockDashboardData });

// Products
mock.onGet('/products').reply(200, { success: true, data: mockProducts });

// Quotes
mock.onGet('/quotes').reply(200, { 
  success: true, 
  data: mockQuotes,
  meta: { page: 1, limit: 20, total: mockQuotes.length }
});

mock.onGet(/\/quotes\/q[a-zA-Z0-9]+$/).reply((config) => {
  const quote = mockQuotes[0]; // For demo, always return the canonical quote
  return [200, { success: true, data: quote }];
});

// Recalculate Quote (Discount flow)
mock.onPost(/\/quotes\/q[a-zA-Z0-9]+\/recalculate$/).reply((config) => {
  // Return the quote with simulated changes
  return [200, { success: true, data: mockQuotes[0] }];
});

// Recommendations (Upsell)
mock.onGet(/\/quotes\/q[a-zA-Z0-9]+\/recommendations$/).reply(200, {
  success: true,
  data: mockRecommendations
});

// Approvals
mock.onPost(/\/quotes\/q[a-zA-Z0-9]+\/approval\/action$/).reply(200, {
  success: true,
  data: { success: true }
});

// Fulfillment
mock.onGet(/\/orders\/[a-zA-Z0-9]+\/fulfillment\/recommendation$/).reply(200, {
  success: true,
  data: mockOrderFulfillment
});

// Billing
mock.onGet(/\/orders\/[a-zA-Z0-9]+\/billing$/).reply(200, {
  success: true,
  data: mockOrderBilling
});

// Customer Portal
mock.onGet(/\/portal\/quotes\/[a-zA-Z0-9]+$/).reply(200, {
  success: true,
  data: mockQuotes[0]
});

export default mock;
