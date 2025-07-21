# Production Deployment Guide

## 🚀 Production Deployment Status

**✅ SUCCESSFULLY DEPLOYED:** [https://shopify-ai-product-optimizer.onrender.com](https://shopify-ai-product-optimizer.onrender.com)

**Platform:** Render  
**Status:** Live and operational  
**Last Updated:** January 2025  
**Build Status:** ✅ Passing  

## 🛠️ Render Deployment (Recommended)

### Quick Setup
1. **Fork/Clone** this repository to your GitHub account
2. **Connect to Render** at [render.com](https://render.com)
3. **Create new Web Service** from your GitHub repository
4. **Configure build settings:**
   ```
   Build Command: npm install; npm run build
   Start Command: npm start
   ```

### Environment Variables for Render
Add these in your Render service dashboard under "Environment":

```env
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=write_products,read_products
SHOPIFY_APP_URL=https://your-render-service.onrender.com
DATABASE_URL=file:./prod.sqlite
OPENAI_API_KEY=sk-your_openai_api_key
SESSION_SECRET=your_32_character_secure_random_string
NODE_ENV=production
OPENAI_RATE_LIMIT=50
BULK_ANALYSIS_LIMIT=5
```

### ⚠️ Critical Dependency Fix
**Important:** Ensure `@shopify/shopify-app-remix` is in `dependencies` (not `devDependencies`) in `package.json`. This prevents build failures in production environments.

✅ **Correct configuration:**
```json
{
  "dependencies": {
    "@shopify/shopify-app-remix": "^3.8.2"
  }
}
```

❌ **Incorrect (causes build failures):**
```json
{
  "devDependencies": {
    "@shopify/shopify-app-remix": "^3.8.2"
  }
}
```

## Pre-Deployment Checklist

### ✅ **Environment Configuration**
- [ ] Copy `env.example` to `.env` and configure all required variables
- [ ] Obtain OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- [ ] Set up Shopify app in Partner Dashboard
- [ ] Configure production database (PostgreSQL recommended)
- [ ] Set secure `SESSION_SECRET` (use `openssl rand -base64 32`)

### ✅ **Security & Performance**
- [ ] Review rate limiting settings in `app/services/rate-limiter.server.ts`
- [ ] Configure CORS and security headers
- [ ] Set up monitoring and logging
- [ ] Test error handling with invalid inputs
- [ ] Verify OpenAI API cost controls

### ✅ **Testing**
- [ ] Run `npm run test` to verify all tests pass
- [ ] Test with real Shopify store data
- [ ] Verify bulk analysis performance with large product catalogs
- [ ] Test Judge.me integration if applicable

## Required Environment Variables

```env
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=write_products,read_products
SHOPIFY_APP_URL=https://your-production-domain.com

# Database (Use PostgreSQL in production)
DATABASE_URL=postgresql://username:password@host:port/database

# OpenAI (Required)
OPENAI_API_KEY=sk-your_openai_api_key

# Security
SESSION_SECRET=your_32_character_secure_random_string

# Production Settings
NODE_ENV=production

# Optional: Rate Limiting
OPENAI_RATE_LIMIT=50
BULK_ANALYSIS_LIMIT=5

# Optional: Judge.me Integration
JUDGE_ME_API_TOKEN=your_judge_me_token
```

## Deployment Steps

### 1. **Database Setup**
```bash
# Generate Prisma client
npm run prisma generate

# Run database migrations
npm run prisma migrate deploy
```

### 2. **Build Application**
```bash
# Install dependencies
npm ci --production=false

# Build for production
npm run build

# Install only production dependencies
npm ci --production
```

### 3. **Deploy to Platform**

#### **Shopify Hosting (Recommended)**
```bash
# Deploy to Shopify
npm run deploy
```

#### **Custom Hosting (Heroku, Railway, etc.)**
```bash
# Start production server
npm start
```

## Production Optimizations

### **OpenAI Cost Management**
- Rate limiting: 50 requests/hour per store (configurable)
- Bulk analysis limiting: 5 bulk runs/hour per store
- Caching: 24-hour cache to reduce API calls
- Token limits: 4000 max tokens per request

### **Performance Monitoring**
Monitor these metrics:
- OpenAI API response times
- Cache hit rates
- Error rates by type
- Rate limit violations

### **Error Handling**
- Graceful fallbacks for OpenAI failures
- Detailed error logging for debugging
- User-friendly error messages
- Automatic retries with exponential backoff

## Post-Deployment Verification

### **Functional Tests**
1. Install app on test store
2. Analyze individual products
3. Run bulk analysis (small batch)
4. Test product editing workflow
5. Verify cache behavior
6. Test rate limiting

### **Performance Tests**
1. Bulk analyze 50+ products
2. Monitor memory usage
3. Check database performance
4. Verify OpenAI API usage

### **Security Tests**
1. Test with malformed product data
2. Verify rate limiting works
3. Check error message security
4. Test session handling

## Monitoring & Maintenance

### **Key Metrics to Track**
- OpenAI API usage and costs
- Analysis success/failure rates
- User engagement metrics
- Performance metrics

### **Regular Maintenance**
- Monitor OpenAI API costs
- Review error logs weekly
- Update dependencies monthly
- Backup database regularly

### **Scaling Considerations**
- Consider Redis for caching in multi-instance deployments
- Monitor database connection limits
- Implement proper logging aggregation
- Set up health checks

## Troubleshooting

### **Common Issues**

#### **OpenAI API Errors**
- Check API key validity
- Verify rate limits not exceeded
- Monitor token usage
- Check network connectivity

#### **Database Issues**
- Verify connection string
- Check migration status
- Monitor connection pool

#### **Performance Issues**
- Check cache hit rates
- Monitor memory usage
- Review database queries
- Analyze OpenAI response times

## 🔧 Troubleshooting Common Deployment Issues

### **Build Failures**

#### "Rollup failed to resolve import @shopify/shopify-app-remix/server"
**Solution:** Move `@shopify/shopify-app-remix` from `devDependencies` to `dependencies` in `package.json`

```bash
# Fix the dependency placement
npm uninstall @shopify/shopify-app-remix
npm install @shopify/shopify-app-remix
```

#### "Module not found" errors during build
**Solution:** Ensure all production dependencies are in `dependencies`, not `devDependencies`

### **Runtime Failures**

#### "Detected an empty appUrl configuration"
**Solution:** Add the `SHOPIFY_APP_URL` environment variable
```env
SHOPIFY_APP_URL=https://your-service-name.onrender.com
```

#### "No open ports detected"
**Solution:** The app should automatically bind to the PORT environment variable. Ensure your start command is:
```bash
npm start
```

#### Database connection errors
**Solution:** For SQLite (development), use:
```env
DATABASE_URL=file:./prod.sqlite
```

For PostgreSQL (production), get connection string from your database provider.

### **Environment Variable Issues**

#### Missing SESSION_SECRET
**Generate a secure session secret:**
```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### SCOPES vs SHOPIFY_SCOPES
**Use `SHOPIFY_SCOPES` (not `SCOPES`):**
```env
SHOPIFY_SCOPES=write_products,read_products
```

### **Performance Issues**

#### High OpenAI API costs
**Adjust rate limiting:**
```env
OPENAI_RATE_LIMIT=25  # Reduce from default 50
BULK_ANALYSIS_LIMIT=3  # Reduce from default 5
```

#### Slow response times
1. Check if caching is working (look for `cacheStatus: "hit"` in responses)
2. Monitor database performance
3. Consider upgrading hosting plan

### **Getting Help**

1. **Check build logs** in your hosting provider dashboard
2. **Review environment variables** - ensure all required variables are set
3. **Test locally first** with production environment variables
4. **Check the live demo** - [https://shopify-ai-product-optimizer.onrender.com](https://shopify-ai-product-optimizer.onrender.com)

### **Success Indicators**

✅ Build completes without errors  
✅ Server starts and binds to port  
✅ Health check endpoint responds: `https://your-app.com/healthz`  
✅ App can be installed in Shopify store  
✅ Product analysis returns results  

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test individual components
4. Review error handling logs

## Security Notes

- Never commit `.env` files
- Use strong session secrets
- Monitor for unusual API usage
- Implement proper access controls
- Regular security updates 