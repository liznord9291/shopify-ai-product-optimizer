export interface ScrapedProductContent {
  title: string;
  description: string;
  price?: string;
  images?: string[];
  url: string;
  metadata: {
    scrapedFrom: string;
    scrapedDate: Date;
    platform?: string;
  }
}

export interface SiteAnalysis {
  products: ScrapedProductContent[];
  siteMetrics: {
    totalProducts: number;
    averageProductScore: number;
    topIssues: string[];
    improvement_opportunities: string[];
  }
} 