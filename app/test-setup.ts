// Test setup file
import { vi } from 'vitest';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-key';
process.env.SHOPIFY_API_KEY = 'test-shopify-key';
process.env.SHOPIFY_API_SECRET = 'test-shopify-secret';
process.env.DATABASE_URL = 'file:./test.db';
process.env.SESSION_SECRET = 'test-session-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}; 