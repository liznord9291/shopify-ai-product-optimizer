import { chromium } from 'playwright';
import type { ScrapedProductContent, SiteAnalysis } from '../types/scraping';
import { analyzeLLMDiscoverability } from './llm-analysis.server';

export async function scrapeMerchantSite(url: string): Promise<SiteAnalysis> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  try {
    const page = await context.newPage();
    await page.goto(url);

    // Extract product links
    const productLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(link => {
          const href = link.href;
          return href.includes('/products/') || 
                 href.includes('/product/') || 
                 href.includes('/item/');
        })
        .map(link => link.href);
    });

    // Scrape first 5 products for analysis
    const products: ScrapedProductContent[] = [];
    for (const link of productLinks.slice(0, 5)) {
      const product = await scrapeProduct(context, link);
      if (product) {
        products.push(product);
      }
    }

    // Analyze products with LLM
    const analysisResults = await Promise.all(
      products.map(product => analyzeLLMDiscoverability({
        title: product.title,
        description: product.description,
        tags: [], // Could extract from meta tags
        vendor: new URL(url).hostname,
        productType: '', // Could be inferred from categories
        metafields: [] // Could extract from structured data
      }))
    );

    // Calculate site metrics
    const siteMetrics = calculateSiteMetrics(products, analysisResults);

    await browser.close();
    return {
      products,
      siteMetrics
    };
  } catch (error) {
    console.error('Error scraping merchant site:', error);
    await browser.close();
    throw error;
  }
}

async function scrapeProduct(context: any, url: string): Promise<ScrapedProductContent | null> {
  try {
    const page = await context.newPage();
    await page.goto(url);

    // Extract product information
    const product = await page.evaluate(() => {
      // Try to find product title
      const titleSelectors = [
        'h1',
        '[class*="product-title"]',
        '[class*="productTitle"]',
        '[class*="product-name"]'
      ];
      const title = titleSelectors
        .map(selector => document.querySelector(selector)?.textContent?.trim())
        .find(text => text);

      // Try to find product description
      const descriptionSelectors = [
        '[class*="product-description"]',
        '[class*="productDescription"]',
        '[class*="description"]',
        'meta[name="description"]'
      ];
      const description = descriptionSelectors
        .map(selector => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || element?.getAttribute('content')?.trim();
        })
        .find(text => text);

      // Try to find price
      const priceSelectors = [
        '[class*="price"]',
        '[class*="product-price"]',
        '[class*="productPrice"]'
      ];
      const price = priceSelectors
        .map(selector => document.querySelector(selector)?.textContent?.trim())
        .find(text => text);

      // Try to find images
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src.includes('product') || src.includes('item'));

      return { title, description, price, images };
    });

    await page.close();

    if (!product.title || !product.description) {
      return null;
    }

    return {
      ...product,
      url,
      metadata: {
        scrapedFrom: new URL(url).hostname,
        scrapedDate: new Date(),
        platform: detectEcommercePlatform(await page.content())
      }
    };
  } catch (error) {
    console.error(`Error scraping product ${url}:`, error);
    return null;
  }
}

function calculateSiteMetrics(
  products: ScrapedProductContent[], 
  analysisResults: any[]
): SiteAnalysis['siteMetrics'] {
  const scores = analysisResults.map(result => result.scores.discoveryPotential);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Aggregate common issues
  const issues = new Set<string>();
  analysisResults.forEach(result => {
    result.contentGaps.forEach((gap: string) => issues.add(gap));
  });

  // Find improvement opportunities
  const opportunities = new Set<string>();
  analysisResults.forEach(result => {
    result.llmOptimizations.forEach((opt: any) => {
      opt.suggestions.forEach((suggestion: string) => opportunities.add(suggestion));
    });
  });

  return {
    totalProducts: products.length,
    averageProductScore: Math.round(averageScore),
    topIssues: Array.from(issues).slice(0, 5),
    improvement_opportunities: Array.from(opportunities).slice(0, 5)
  };
}

function detectEcommercePlatform(html: string): string | undefined {
  if (html.includes('shopify')) return 'Shopify';
  if (html.includes('woocommerce')) return 'WooCommerce';
  if (html.includes('magento')) return 'Magento';
  return undefined;
} 