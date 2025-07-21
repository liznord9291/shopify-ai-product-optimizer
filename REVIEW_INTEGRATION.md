# Review Data Integration Guide

## Overview

AI Readability 2.0 can analyze your customer review data to provide enhanced, personalized recommendations based on actual customer feedback and language. This integration works with Judge.me and other review apps that store data in Shopify metafields.

## Benefits of Review Integration

When review data is available, you'll get:

### 🗣️ Customer Language Insights
- Phrases and terms your customers actually use in reviews
- Natural language variations that improve AI discoverability
- Keywords customers search for but might be missing from your content

### ⚠️ Proactive Issue Addressing
- Common complaints from negative reviews to address in product descriptions
- Concerns to proactively answer before customers ask
- Quality issues to highlight improvements for

### ⭐ Customer-Praised Benefits
- Benefits most frequently mentioned in positive reviews
- Features customers love that should be highlighted more
- Social proof opportunities from customer testimonials

### 🔍 Missing Keywords
- Important terms customers use that aren't in your product content
- Search terms from reviews that could improve discoverability
- Alternative product names and descriptions customers prefer

### 🎯 Social Proof Optimization
- Better ways to leverage your review data
- Suggestions for review display and highlighting
- Opportunities to showcase customer satisfaction

## Setup Instructions

### Method 1: Automatic Detection (Recommended)
If you have Judge.me installed, the app will automatically detect review data from your product metafields. No additional setup required!

### Method 2: Judge.me API Integration (Advanced)
For detailed review content analysis, you can optionally configure Judge.me API access:

1. **Get your Judge.me API Token:**
   - Log into your Judge.me dashboard
   - Go to API section
   - Copy your API Token

2. **Add to your environment variables:**
   ```env
   JUDGE_ME_API_TOKEN=your_judge_me_api_token
   ```

3. **Restart your app** to enable enhanced review analysis

## Supported Review Apps

### ✅ Judge.me
- **Automatic Detection**: Yes (via metafields)
- **Enhanced API**: Yes (with API token)
- **Data Available**: Ratings, review count, review content, customer language

### 🔄 Other Review Apps
The app can detect basic review data (ratings, counts) from any review app that stores data in Shopify metafields with these patterns:
- `reviews.rating`
- `reviews.rating_count`
- `reviews.*`

## What You'll See

### Without Review Data
- Standard LLM optimization recommendations
- Setup guidance for installing review apps
- Placeholder sections showing what's possible with reviews

### With Review Data
- **Customer Review Insights** section with 5 categories of recommendations
- Review-enhanced suggestions in copy-paste format
- Customer language integration in all recommendations
- Proactive issue addressing based on negative feedback

## Privacy & Security

- Review data is only used for generating recommendations
- No review content is stored permanently
- Customer names and personal information are not included in analysis
- All processing happens securely within your Shopify app environment

## Troubleshooting

### "No review data detected"
- Ensure Judge.me or another review app is installed
- Check that you have products with reviews
- Verify review app is storing data in Shopify metafields

### "Limited review insights"
- Install Judge.me for best compatibility
- Ensure review app stores data in standard metafield format
- Consider adding Judge.me API token for enhanced analysis

### "Review recommendations seem generic"
- More reviews = better recommendations
- Encourage customers to leave detailed reviews
- Ensure review app is capturing review content, not just ratings

## Getting More Reviews

To maximize the benefit of review integration:

1. **Install Judge.me** for automatic review requests
2. **Enable post-purchase emails** to request reviews
3. **Add review widgets** to product pages
4. **Incentivize reviews** with discounts or loyalty points
5. **Respond to reviews** to encourage more detailed feedback

## Support

If you need help setting up review integration or have questions about the enhanced recommendations, please check the main app documentation or contact support. 