# Production Deployment Guide

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