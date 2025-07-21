import type { ProductAnalysis } from '../types/analysis';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class OpenAIError extends AppError {
  constructor(message: string, originalError?: any) {
    super(`OpenAI API Error: ${message}`, 503, 'OPENAI_ERROR');
    if (originalError) {
      console.error('OpenAI Error Details:', originalError);
    }
  }
}

export class ShopifyError extends AppError {
  constructor(message: string, originalError?: any) {
    super(`Shopify API Error: ${message}`, 502, 'SHOPIFY_ERROR');
    if (originalError) {
      console.error('Shopify Error Details:', originalError);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(`Validation Error: ${message}`, 400, 'VALIDATION_ERROR');
  }
}

export function createFallbackAnalysis(productTitle: string = 'Unknown Product'): ProductAnalysis {
  return {
    scores: {
      semanticClarity: 0,
      intentMatching: 0,
      featureBenefitStructure: 0,
      naturalLanguage: 0,
      structuredInfo: 0,
      discoveryPotential: 0
    },
    contentStrengths: ["Product information is present"],
    contentGaps: ["Analysis temporarily unavailable - please try again"],
    llmOptimizations: [
      {
        category: "System Error",
        score: 0,
        suggestions: ["Analysis service is temporarily unavailable. Please try again in a few moments."],
        specificContent: {}
      }
    ],
    improvedContent: {
      title: productTitle,
      suggestions: ["Analysis service temporarily unavailable"],
      description: "Please try analyzing this product again",
      descriptionSuggestions: ["Analysis service temporarily unavailable"],
      specificEnhancements: {
        copyPasteTitle: productTitle,
        copyPasteDescriptionSentences: [],
        suggestedTags: [],
        featureBenefitPairs: [],
        specifications: []
      }
    },
    reviewEnhancedRecommendations: {
      customerLanguageSuggestions: ["Analysis service temporarily unavailable"],
      addressedConcerns: ["Analysis service temporarily unavailable"],
      highlightedBenefits: ["Analysis service temporarily unavailable"],
      missingKeywords: ["Analysis service temporarily unavailable"],
      socialProofSuggestions: ["Analysis service temporarily unavailable"]
    }
  };
}

export function validateProductData(product: any): void {
  if (!product) {
    throw new ValidationError('Product data is required');
  }
  
  if (!product.title || typeof product.title !== 'string') {
    throw new ValidationError('Product title is required and must be a string');
  }
  
  if (product.title.length > 255) {
    throw new ValidationError('Product title must be less than 255 characters');
  }
  
  if (product.description && typeof product.description !== 'string') {
    throw new ValidationError('Product description must be a string');
  }
  
  if (product.tags && !Array.isArray(product.tags)) {
    throw new ValidationError('Product tags must be an array');
  }
}

export function handleAnalysisError(error: any, productTitle?: string): ProductAnalysis {
  console.error('Analysis Error:', {
    message: error.message,
    stack: error.stack,
    productTitle,
    timestamp: new Date().toISOString()
  });

  // Log specific error types for monitoring
  if (error.message?.includes('OpenAI')) {
    console.error('OpenAI Service Issue:', error);
  } else if (error.message?.includes('rate limit')) {
    console.error('Rate Limit Hit:', error);
  } else if (error.message?.includes('timeout')) {
    console.error('Request Timeout:', error);
  }

  return createFallbackAnalysis(productTitle);
}

export function isRateLimitError(error: any): boolean {
  return error.message?.toLowerCase().includes('rate limit') ||
         error.status === 429 ||
         error.code === 'rate_limit_exceeded';
}

export function isNetworkError(error: any): boolean {
  return error.message?.toLowerCase().includes('network') ||
         error.message?.toLowerCase().includes('timeout') ||
         error.code === 'ECONNRESET' ||
         error.code === 'ENOTFOUND';
} 