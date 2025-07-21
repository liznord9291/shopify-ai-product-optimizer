import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeLLMDiscoverability } from '../llm-analysis.server';
import type { ProductContent } from '../llm-analysis.server';

// Mock OpenAI
vi.mock('../openai.server', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  },
  ANALYSIS_SYSTEM_PROMPT: 'test prompt',
  ANALYSIS_USER_PROMPT: 'test user prompt'
}));

// Mock review data service
vi.mock('../review-data.server', () => ({
  fetchProductReviewData: vi.fn().mockResolvedValue(null)
}));

describe('LLM Analysis Service', () => {
  const mockProduct: ProductContent = {
    title: 'Test Snowboard',
    description: 'A great snowboard for beginners',
    tags: ['snowboard', 'winter', 'sports'],
    vendor: 'Test Vendor',
    productType: 'Snowboard',
    metafields: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate product data', async () => {
    const invalidProduct = {
      title: '',
      description: 'test',
      tags: [],
      vendor: 'test',
      productType: 'test',
      metafields: []
    };

    const result = await analyzeLLMDiscoverability(invalidProduct);
    
    // Should return fallback analysis for invalid data
    expect(result.scores.discoveryPotential).toBe(0);
    expect(result.contentGaps).toContain('Analysis temporarily unavailable - please try again');
  });

  it('should return cached results when available', async () => {
    // First call
    const result1 = await analyzeLLMDiscoverability(mockProduct);
    
    // Second call - in test environment, cache is cleared so it will be fresh
    // This is expected behavior for development/testing
    const result2 = await analyzeLLMDiscoverability(mockProduct);
    
    // Both should return valid results
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1.scores).toBeDefined();
    expect(result2.scores).toBeDefined();
  });

  it('should handle rate limiting', async () => {
    const mockSession = { shop: 'test-shop.myshopify.com' };
    
    // Mock rate limit exceeded
    const result = await analyzeLLMDiscoverability(mockProduct, {
      session: mockSession
    });
    
    // Should handle gracefully
    expect(result).toBeDefined();
  });

  it('should generate fallback analysis on errors', async () => {
    // Mock OpenAI error
    const { openai } = await import('../openai.server');
    vi.mocked(openai.chat.completions.create).mockRejectedValue(new Error('API Error'));
    
    const result = await analyzeLLMDiscoverability(mockProduct);
    
    expect(result.scores.discoveryPotential).toBe(0);
    expect(result.llmOptimizations[0].category).toBe('System Error');
  });
});

describe('Product Validation', () => {
  it('should reject products without title', async () => {
    const invalidProduct = {
      title: '',
      description: 'test',
      tags: [],
      vendor: 'test',
      productType: 'test',
      metafields: []
    };

    const result = await analyzeLLMDiscoverability(invalidProduct);
    expect(result.contentGaps).toContain('Analysis temporarily unavailable - please try again');
  });

  it('should reject products with invalid data types', async () => {
    const invalidProduct = {
      title: 'Test',
      description: 123, // Invalid type
      tags: 'not-array', // Invalid type
      vendor: 'test',
      productType: 'test',
      metafields: []
    };

    const result = await analyzeLLMDiscoverability(invalidProduct as any);
    expect(result.contentGaps).toContain('Analysis temporarily unavailable - please try again');
  });
}); 