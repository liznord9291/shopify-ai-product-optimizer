import type { ReviewData } from '../types/analysis';

interface JudgeMeMetafields {
  rating?: {
    value: number;
    scale_min: number;
    scale_max: number;
  };
  rating_count?: number;
}

interface JudgeMeReview {
  id: string;
  rating: number;
  title?: string;
  body: string;
  reviewer?: {
    name: string;
    verified: boolean;
  };
  created_at: string;
  helpful_count?: number;
}

/**
 * Extract Judge.me review data from Shopify metafields
 */
export function extractJudgeMeMetafields(metafields: Array<{ key: string; value: string; namespace?: string }>): JudgeMeMetafields {
  const reviewMetafields: JudgeMeMetafields = {};
  
  metafields.forEach(field => {
    // Judge.me stores review data in the 'reviews' namespace
    if (field.namespace === 'reviews' || field.key.startsWith('reviews.')) {
      const key = field.key.replace('reviews.', '');
      
      switch (key) {
        case 'rating':
          try {
            // Judge.me rating is stored as JSON: {"scale_min":"1.0","scale_max":"5.0","value":"4.3"}
            const ratingData = JSON.parse(field.value);
            reviewMetafields.rating = {
              value: parseFloat(ratingData.value),
              scale_min: parseFloat(ratingData.scale_min),
              scale_max: parseFloat(ratingData.scale_max)
            };
          } catch (e) {
            // Fallback: try parsing as plain number
            const rating = parseFloat(field.value);
            if (!isNaN(rating)) {
              reviewMetafields.rating = {
                value: rating,
                scale_min: 1,
                scale_max: 5
              };
            }
          }
          break;
        case 'rating_count':
          reviewMetafields.rating_count = parseInt(field.value, 10);
          break;
      }
    }
  });
  
  return reviewMetafields;
}

/**
 * Fetch detailed review data from Judge.me API (optional)
 * This would require Judge.me API credentials
 */
export async function fetchJudgeMeReviews(
  shopDomain: string, 
  productId: string, 
  apiToken?: string
): Promise<JudgeMeReview[]> {
  if (!apiToken) {
    console.log('No Judge.me API token provided, skipping detailed review fetch');
    return [];
  }
  
  try {
    const response = await fetch(`https://judge.me/api/v1/reviews`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add query parameters for Judge.me API
      // Note: This is a simplified example - actual API structure may vary
    });
    
    if (!response.ok) {
      console.error('Failed to fetch Judge.me reviews:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.reviews || [];
  } catch (error) {
    console.error('Error fetching Judge.me reviews:', error);
    return [];
  }
}

/**
 * Analyze review sentiment and extract insights
 */
export function analyzeReviewSentiment(reviews: JudgeMeReview[]): {
  positiveReviews: JudgeMeReview[];
  negativeReviews: JudgeMeReview[];
  commonPhrases: string[];
  frequentComplaints: string[];
  frequentPraises: string[];
} {
  const positiveReviews = reviews.filter(r => r.rating >= 4);
  const negativeReviews = reviews.filter(r => r.rating <= 2);
  
  // Extract common phrases from review text
  const allText = reviews.map(r => `${r.title || ''} ${r.body}`).join(' ').toLowerCase();
  
  // Simple keyword extraction (in production, you'd use more sophisticated NLP)
  const commonPhrases = extractCommonPhrases(allText);
  
  // Extract complaints from negative reviews
  const complaintText = negativeReviews.map(r => r.body.toLowerCase()).join(' ');
  const frequentComplaints = extractCommonPhrases(complaintText, [
    'disappointed', 'poor', 'bad', 'terrible', 'awful', 'hate', 'worst',
    'cheap', 'flimsy', 'broke', 'broken', 'defective', 'problem', 'issue'
  ]);
  
  // Extract praises from positive reviews
  const praiseText = positiveReviews.map(r => r.body.toLowerCase()).join(' ');
  const frequentPraises = extractCommonPhrases(praiseText, [
    'love', 'amazing', 'perfect', 'excellent', 'fantastic', 'great', 'awesome',
    'quality', 'durable', 'comfortable', 'beautiful', 'stylish', 'recommend'
  ]);
  
  return {
    positiveReviews,
    negativeReviews,
    commonPhrases,
    frequentComplaints,
    frequentPraises
  };
}

/**
 * Extract common phrases from text
 */
function extractCommonPhrases(text: string, keywords?: string[]): string[] {
  const words = text.match(/\b\w+\b/g) || [];
  const wordCount = new Map<string, number>();
  
  // Count word frequency
  words.forEach(word => {
    if (word.length > 3) { // Skip short words
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });
  
  // If keywords provided, filter by them
  if (keywords) {
    return keywords.filter(keyword => 
      text.includes(keyword) && (wordCount.get(keyword) || 0) > 1
    );
  }
  
  // Return most frequent words
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Convert Judge.me data to our ReviewData format
 */
export function convertToReviewData(
  metafields: JudgeMeMetafields,
  reviews: JudgeMeReview[] = []
): ReviewData {
  const analysis = analyzeReviewSentiment(reviews);
  
  return {
    averageRating: metafields.rating?.value,
    reviewCount: metafields.rating_count,
    recentReviews: reviews.slice(0, 20).map(review => ({
      rating: review.rating,
      title: review.title,
      body: review.body,
      customerName: review.reviewer?.name,
      verifiedPurchase: review.reviewer?.verified,
      helpful: (review.helpful_count || 0) > 0,
      date: review.created_at,
      sentiment: review.rating >= 4 ? 'positive' : review.rating <= 2 ? 'negative' : 'neutral'
    })),
    commonPhrases: analysis.commonPhrases,
    frequentComplaints: analysis.frequentComplaints,
    frequentPraises: analysis.frequentPraises
  };
}

/**
 * Main function to fetch all Judge.me data for a product
 */
export async function fetchProductReviewData(
  metafields: Array<{ key: string; value: string; namespace?: string }>,
  shopDomain?: string,
  productId?: string,
  judgeMeApiToken?: string
): Promise<ReviewData | null> {
  try {
    // Extract basic review data from metafields
    const metafieldData = extractJudgeMeMetafields(metafields);
    
    // If no review data in metafields, return null
    if (!metafieldData.rating && !metafieldData.rating_count) {
      return null;
    }
    
    // Optionally fetch detailed reviews from Judge.me API
    let detailedReviews: JudgeMeReview[] = [];
    if (shopDomain && productId && judgeMeApiToken) {
      detailedReviews = await fetchJudgeMeReviews(shopDomain, productId, judgeMeApiToken);
    }
    
    return convertToReviewData(metafieldData, detailedReviews);
  } catch (error) {
    console.error('Error fetching product review data:', error);
    return null;
  }
} 