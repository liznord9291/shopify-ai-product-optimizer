import type { ProductAnalysis, ProductContentWithReviews, ReviewData } from '../types/analysis';
import { openai, ANALYSIS_SYSTEM_PROMPT, ANALYSIS_USER_PROMPT } from './openai.server';
import { fetchProductReviewData } from './review-data.server';
import { validateProductData, handleAnalysisError, OpenAIError, isRateLimitError, isNetworkError } from './error-handler.server';
import { checkRateLimit, getRateLimitIdentifier } from './rate-limiter.server';
import crypto from 'crypto';

export interface ProductContent {
  title: string;
  description: string;
  tags: string[];
  vendor: string;
  productType: string;
  metafields: Array<{
    key: string;
    value: string;
  }>;
}

// In-memory cache for analysis results
// In production, you'd want to use Redis or a database
const analysisCache = new Map<string, {
  analysis: ProductAnalysis;
  timestamp: number;
  contentHash: string;
}>();

// Clear cache for testing new prompts - remove in production
if (process.env.NODE_ENV !== 'production') {
  analysisCache.clear();
  console.log('🧹 Analysis cache cleared for testing enhanced prompts');
}

// Cache expiration time (24 hours)
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

function generateContentHash(product: ProductContentWithReviews): string {
  // Create a hash based on all the content that affects analysis
  const contentString = JSON.stringify({
    title: product.title,
    description: product.description,
    tags: product.tags.sort(), // Sort tags for consistent hashing
    vendor: product.vendor,
    productType: product.productType,
    metafields: product.metafields.sort((a, b) => a.key.localeCompare(b.key)), // Sort metafields
    reviewData: product.reviewData // Include review data in hash
  });
  
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

function getCachedAnalysis(contentHash: string): ProductAnalysis | null {
  const cached = analysisCache.get(contentHash);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache has expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRATION_MS) {
    analysisCache.delete(contentHash);
    return null;
  }
  
  console.log('🎯 Using cached analysis for content hash:', contentHash.substring(0, 8));
  return cached.analysis;
}

function setCachedAnalysis(contentHash: string, analysis: ProductAnalysis): void {
  analysisCache.set(contentHash, {
    analysis,
    timestamp: Date.now(),
    contentHash
  });
  
  console.log('💾 Cached analysis for content hash:', contentHash.substring(0, 8));
  
  // Clean up old cache entries (simple cleanup)
  if (analysisCache.size > 1000) {
    const entries = Array.from(analysisCache.entries());
    const oldestEntry = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldestEntry) {
      analysisCache.delete(oldestEntry[0]);
    }
  }
}

// Enhanced system prompt that includes review data context
const REVIEW_ENHANCED_SYSTEM_PROMPT = `${ANALYSIS_SYSTEM_PROMPT}

ADDITIONAL CONTEXT: When review data is available, you should also analyze how well the product content aligns with actual customer feedback and language. Consider:

1. Customer Language Alignment: How well does the product content match the words and phrases customers actually use in reviews?
2. Addressed Concerns: Are common complaints or concerns from negative reviews addressed in the product description?
3. Highlighted Benefits: Are the benefits most praised by customers prominently featured in the content?
4. Missing Keywords: What important terms do customers use that aren't in the product content?
5. Social Proof Opportunities: How could the merchant better leverage positive review insights?

If review data is provided, include a "reviewEnhancedRecommendations" section with specific suggestions based on customer feedback.`;

export async function analyzeLLMDiscoverability(
  product: ProductContent,
  options?: {
    shopDomain?: string;
    productId?: string;
    judgeMeApiToken?: string;
    session?: any;
  }
): Promise<ProductAnalysis & { cacheStatus?: 'cached' | 'fresh'; rateLimited?: boolean }> {
  try {
    // Validate input data
    validateProductData(product);

    // Check rate limits if session is provided
    if (options?.session) {
      const rateLimitId = getRateLimitIdentifier(options.session);
      const rateLimit = checkRateLimit(rateLimitId, 'openai');
      
      if (!rateLimit.allowed) {
        console.warn(`Rate limit exceeded for ${rateLimitId}. Remaining: ${rateLimit.remaining}`);
        return {
          ...handleAnalysisError(new Error('Rate limit exceeded'), product.title),
          cacheStatus: 'fresh',
          rateLimited: true
        };
      }
    }

    // Fetch review data if available
    const reviewData = await fetchProductReviewData(
      product.metafields,
      options?.shopDomain,
      options?.productId,
      options?.judgeMeApiToken
    );

    const productWithReviews: ProductContentWithReviews = {
      ...product,
      reviewData: reviewData || undefined
    };

    // Generate content hash for caching (includes review data)
    const contentHash = generateContentHash(productWithReviews);
    
    // Check cache first
    const cachedAnalysis = getCachedAnalysis(contentHash);
    if (cachedAnalysis) {
      return { ...cachedAnalysis, cacheStatus: 'cached' };
    }
    
    console.log('🔄 Generating new analysis for content hash:', contentHash.substring(0, 8));
    if (reviewData) {
      console.log('📊 Including review data in analysis:', {
        averageRating: reviewData.averageRating,
        reviewCount: reviewData.reviewCount,
        hasDetailedReviews: reviewData.recentReviews && reviewData.recentReviews.length > 0
      });
    }
    
    // Build enhanced user prompt with review data
    let userPrompt = ANALYSIS_USER_PROMPT
      .replace('{title}', product.title)
      .replace('{description}', product.description)
      .replace('{productType}', product.productType)
      .replace('{tags}', product.tags.join(', '))
      .replace('{vendor}', product.vendor)
      .replace('{metafields}', JSON.stringify(product.metafields));

    // Add review data to prompt if available
    if (reviewData) {
      const reviewContext = buildReviewContext(reviewData);
      userPrompt += `\n\nREVIEW DATA AVAILABLE:\n${reviewContext}\n\nPlease analyze how well the product content aligns with customer feedback and provide review-enhanced recommendations.`;
    } else {
      userPrompt += `\n\nNO REVIEW DATA: This product doesn't have review data yet. Focus on standard LLM optimization and suggest how reviews could enhance discoverability once available.`;
    }

    // Call OpenAI with timeout and retry logic
    const response = await callOpenAIWithRetry({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: reviewData ? REVIEW_ENHANCED_SYSTEM_PROMPT : ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 4000 // Limit token usage for cost control
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new OpenAIError('Empty response received');
    }

    const openaiResponse = JSON.parse(content);
    
    // Transform OpenAI response to match our ProductAnalysis type
    const analysis = transformOpenAIResponse(openaiResponse, reviewData);
    
    // Cache the result
    setCachedAnalysis(contentHash, analysis);
    
    return { ...analysis, cacheStatus: 'fresh' };

  } catch (error) {
    console.error('Error in analyzeLLMDiscoverability:', error);
    
    // Handle specific error types
    if (isRateLimitError(error)) {
      return {
        ...handleAnalysisError(error, product.title),
        cacheStatus: 'fresh',
        rateLimited: true
      };
    }
    
    return {
      ...handleAnalysisError(error, product.title),
      cacheStatus: 'fresh'
    };
  }
}

async function callOpenAIWithRetry(params: any, maxRetries: number = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout to the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });
      
      const apiPromise = openai.chat.completions.create(params);
      
      return await Promise.race([apiPromise, timeoutPromise]);
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw new OpenAIError(`API Error (${error.status})`, error);
      }
      
      // Exponential backoff for retryable errors
      if (attempt < maxRetries && (isRateLimitError(error) || isNetworkError(error))) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Retrying OpenAI request in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new OpenAIError(error.message || 'Unknown OpenAI error', error);
    }
  }
  
  throw lastError;
}

function buildReviewContext(reviewData: ReviewData): string {
  const context = [];
  
  if (reviewData.averageRating && reviewData.reviewCount) {
    context.push(`Average Rating: ${reviewData.averageRating}/5 (${reviewData.reviewCount} reviews)`);
  }
  
  if (reviewData.frequentPraises && reviewData.frequentPraises.length > 0) {
    context.push(`Frequently Praised: ${reviewData.frequentPraises.join(', ')}`);
  }
  
  if (reviewData.frequentComplaints && reviewData.frequentComplaints.length > 0) {
    context.push(`Common Complaints: ${reviewData.frequentComplaints.join(', ')}`);
  }
  
  if (reviewData.commonPhrases && reviewData.commonPhrases.length > 0) {
    context.push(`Customer Language: ${reviewData.commonPhrases.join(', ')}`);
  }
  
  if (reviewData.recentReviews && reviewData.recentReviews.length > 0) {
    const sampleReviews = reviewData.recentReviews.slice(0, 3).map(review => 
      `"${review.body}" (${review.rating}/5)`
    );
    context.push(`Sample Reviews: ${sampleReviews.join(' | ')}`);
  }
  
  return context.join('\n');
}

function transformOpenAIResponse(openaiResponse: any, reviewData?: ReviewData | null): ProductAnalysis {
  // Extract scores from the OpenAI response structure
  const scores = {
    semanticClarity: openaiResponse.SemanticClarity?.score || 0,
    intentMatching: openaiResponse.IntentMatching?.score || 0,
    featureBenefitStructure: openaiResponse.FeatureBenefitStructure?.score || 0,
    naturalLanguage: openaiResponse.NaturalLanguageOptimization?.score || 0,
    structuredInfo: openaiResponse.StructuredInformation?.score || 0,
    discoveryPotential: 0 // Will calculate below
  };

  // Calculate weighted average for discovery potential
  scores.discoveryPotential = Math.round(
    (scores.semanticClarity * 0.25) +
    (scores.intentMatching * 0.25) +
    (scores.featureBenefitStructure * 0.20) +
    (scores.naturalLanguage * 0.15) +
    (scores.structuredInfo * 0.15)
  );

  // Extract content strengths from all categories
  const contentStrengths: string[] = [];
  Object.values(openaiResponse).forEach((category: any) => {
    if (category.strengths) {
      contentStrengths.push(...category.strengths);
    }
  });

  // Extract content gaps (areas for improvement) from all categories
  const contentGaps: string[] = [];
  Object.values(openaiResponse).forEach((category: any) => {
    if (category.areasForImprovement) {
      contentGaps.push(...category.areasForImprovement);
    }
  });

  // Transform optimization suggestions with enhanced specificity
  const llmOptimizations = Object.entries(openaiResponse).map(([key, category]: [string, any]) => ({
    category: key.replace(/([A-Z])/g, ' $1').trim(), // Convert camelCase to readable format
    score: category.score || 0,
    suggestions: category.optimizationSuggestions || [],
    specificContent: category.specificContentSuggestions || {}
  }));

  // Extract specific content suggestions for immediate use
  const specificSuggestions = {
    titleSuggestions: [] as string[],
    descriptionSuggestions: [] as string[],
    tagSuggestions: [] as string[],
    featureBenefitPairs: [] as any[],
    conversationalPhrases: [] as string[],
    specifications: [] as string[]
  };

  // Collect specific content suggestions from all categories
  Object.values(openaiResponse).forEach((category: any) => {
    const specific = category.specificContentSuggestions;
    if (specific) {
      // Title suggestions
      if (specific.titleAdditions) {
        specificSuggestions.titleSuggestions.push(...specific.titleAdditions);
      }
      
      // Description suggestions
      if (specific.descriptionSentences) {
        specificSuggestions.descriptionSuggestions.push(...specific.descriptionSentences);
      }
      
      // Tag suggestions
      if (specific.suggestedTags) {
        specificSuggestions.tagSuggestions.push(...specific.suggestedTags);
      }
      
      // Feature-benefit pairs
      if (specific.featureBenefitPairs) {
        specificSuggestions.featureBenefitPairs.push(...specific.featureBenefitPairs);
      }
      
      // Conversational phrases
      if (specific.conversationalPhrases) {
        specificSuggestions.conversationalPhrases.push(...specific.conversationalPhrases);
      }
      
      // Specifications
      if (specific.specifications) {
        specificSuggestions.specifications.push(...specific.specifications);
      }
    }
  });

  // Build the analysis object
  const analysis: ProductAnalysis = {
    scores,
    contentStrengths,
    contentGaps,
    llmOptimizations,
    improvedContent: {
      title: specificSuggestions.titleSuggestions[0] || "Enhanced title suggestions would appear here",
      suggestions: specificSuggestions.titleSuggestions,
      description: specificSuggestions.descriptionSuggestions[0] || "Enhanced description would appear here",
      descriptionSuggestions: specificSuggestions.descriptionSuggestions,
      specificEnhancements: {
        copyPasteTitle: specificSuggestions.titleSuggestions[0] || "",
        copyPasteDescriptionSentences: specificSuggestions.descriptionSuggestions,
        suggestedTags: specificSuggestions.tagSuggestions,
        featureBenefitPairs: specificSuggestions.featureBenefitPairs,
        specifications: specificSuggestions.specifications
      }
    }
  };

  // Add review-enhanced recommendations if review data was available
  if (reviewData && openaiResponse.reviewEnhancedRecommendations) {
    analysis.reviewEnhancedRecommendations = {
      customerLanguageSuggestions: openaiResponse.reviewEnhancedRecommendations.customerLanguageSuggestions || [],
      addressedConcerns: openaiResponse.reviewEnhancedRecommendations.addressedConcerns || [],
      highlightedBenefits: openaiResponse.reviewEnhancedRecommendations.highlightedBenefits || [],
      missingKeywords: openaiResponse.reviewEnhancedRecommendations.missingKeywords || [],
      socialProofSuggestions: openaiResponse.reviewEnhancedRecommendations.socialProofSuggestions || []
    };
  } else if (!reviewData) {
    // Provide guidance for when reviews become available
    analysis.reviewEnhancedRecommendations = {
      customerLanguageSuggestions: ["Install Judge.me or similar review app to unlock customer language insights"],
      addressedConcerns: ["Customer concerns will be identified once review data is available"],
      highlightedBenefits: ["Customer-praised benefits will be highlighted when reviews are collected"],
      missingKeywords: ["Customer-used keywords will be suggested after gathering review data"],
      socialProofSuggestions: [
        "Set up Judge.me to start collecting reviews automatically",
        "Enable review request emails after purchase",
        "Display star ratings in product listings",
        "Add review widgets to product pages"
      ]
    };
  }

  return analysis;
} 