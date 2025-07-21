export interface ProductAnalysis {
  scores: {
    semanticClarity: number;      // How well the product's purpose and context are explained
    intentMatching: number;       // How well it aligns with potential user queries
    featureBenefitStructure: number; // How clearly features are connected to benefits
    naturalLanguage: number;      // How well it flows in conversational context
    structuredInfo: number;       // How well information is organized and linked
    discoveryPotential: number;   // Overall weighted score
  };
  contentStrengths: string[];
  contentGaps: string[];
  llmOptimizations: Array<{
    category: string;
    score: number;
    suggestions: string[];
    specificContent?: any; // Enhanced specific content suggestions
  }>;
  improvedContent: {
    title: string;
    suggestions: string[];
    description: string;
    descriptionSuggestions: string[];
    specificEnhancements?: {
      copyPasteTitle: string;
      copyPasteDescriptionSentences: string[];
      suggestedTags: string[];
      featureBenefitPairs: Array<{feature: string; benefit: string}>;
      specifications: string[];
    };
  };
  // New review-enhanced recommendations
  reviewEnhancedRecommendations?: {
    customerLanguageSuggestions: string[];  // Phrases from actual customer reviews
    addressedConcerns: string[];            // Issues mentioned in negative reviews to address
    highlightedBenefits: string[];          // Benefits frequently mentioned in positive reviews
    missingKeywords: string[];              // Keywords customers use that aren't in product content
    socialProofSuggestions: string[];       // How to better leverage review data
  };
}

// New interface for review data from Judge.me
export interface ReviewData {
  averageRating?: number;
  reviewCount?: number;
  recentReviews?: Array<{
    rating: number;
    title?: string;
    body: string;
    customerName?: string;
    verifiedPurchase?: boolean;
    helpful?: boolean;
    date?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }>;
  commonPhrases?: string[];
  frequentComplaints?: string[];
  frequentPraises?: string[];
}

// Extended ProductContent interface to include review data
export interface ProductContentWithReviews {
  title: string;
  description: string;
  tags: string[];
  vendor: string;
  productType: string;
  metafields: Array<{
    key: string;
    value: string;
  }>;
  reviewData?: ReviewData;
} 