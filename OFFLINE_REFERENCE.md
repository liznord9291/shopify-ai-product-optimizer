# 📖 AI Readability App - Offline Reference Guide

## 🎯 Quick Start Checklist

### **Before You Begin:**
- [ ] Understand JavaScript ES6+ (destructuring, async/await, arrow functions)
- [ ] Basic TypeScript knowledge (interfaces, types, generics)
- [ ] React hooks concepts (useState, useEffect)
- [ ] Node.js fundamentals (modules, environment variables)

### **Study Order:**
1. **Data Structures** → `app/types/analysis.ts`
2. **Error Handling** → `app/services/error-handler.server.ts`
3. **Core Logic** → `app/services/llm-analysis.server.ts`
4. **UI Patterns** → `app/routes/app._index.tsx`
5. **Testing** → `app/services/__tests__/llm-analysis.test.ts`

---

## 🔍 Key Patterns Reference

### **1. TypeScript Interface Pattern**
```typescript
// Define data shape
export interface ProductAnalysis {
  scores: {
    semanticClarity: number;
    intentMatching: number;
  };
  contentStrengths: string[];
  llmOptimizations: OptimizationSuggestion[];
}

// Optional properties
interface User {
  name: string;
  email?: string;  // Optional
}

// Union types
type Status = 'loading' | 'success' | 'error';
```

### **2. Error Handling Pattern**
```typescript
// Custom error classes
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

// Graceful error handling
export function handleAnalysisError(error: any): ProductAnalysis {
  console.error('Analysis Error:', error);
  return createFallbackAnalysis(); // Always provide fallback
}

// Try-catch with fallback
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  return handleError(error);
}
```

### **3. Async/Await with Retry Pattern**
```typescript
async function callWithRetry(params: any, maxRetries: number = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 30000);
      });
      
      const apiPromise = api.call(params);
      
      // Race between API call and timeout
      return await Promise.race([apiPromise, timeoutPromise]);
      
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries && shouldRetry(error)) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
}
```

### **4. Caching Pattern**
```typescript
// In-memory cache with expiration
const cache = new Map<string, {
  data: any;
  timestamp: number;
  hash: string;
}>();

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCached(key: string): any | null {
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  // Check expiration
  if (Date.now() - entry.timestamp > CACHE_EXPIRATION_MS) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCached(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    hash: generateHash(data)
  });
}
```

### **5. Rate Limiting Pattern**
```typescript
class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60 * 60 * 1000
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);
    
    // New window or expired
    if (!entry || now >= entry.resetTime) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    // Check limit
    if (entry.count >= this.maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }
}
```

### **6. Remix Loader/Action Pattern**
```typescript
// SERVER-SIDE: Runs on server
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticate user
  const { admin } = await authenticate.admin(request);
  
  // Fetch data
  const response = await admin.graphql(`
    query {
      products(first: 10) {
        nodes { id title description }
      }
    }
  `);
  
  // Return JSON
  return json({ products: response.data.products.nodes });
};

// SERVER-SIDE: Handles form submissions
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  
  if (actionType === "analyze") {
    const result = await analyzeProduct(productData);
    return json({ analysis: result });
  }
  
  return json({ error: "Invalid action" });
};

// CLIENT-SIDE: React component
export default function Component() {
  const { products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  
  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("actionType", "analyze");
    submit(formData, { method: "POST" });
  };
  
  return <div>{/* UI */}</div>;
}
```

### **7. Input Validation Pattern**
```typescript
export function validateProductData(product: any): void {
  if (!product) {
    throw new ValidationError('Product data is required');
  }
  
  if (!product.title || typeof product.title !== 'string') {
    throw new ValidationError('Product title must be a string');
  }
  
  if (product.title.length > 255) {
    throw new ValidationError('Title too long');
  }
  
  if (product.tags && !Array.isArray(product.tags)) {
    throw new ValidationError('Tags must be an array');
  }
}
```

### **8. Environment Variable Pattern**
```typescript
// Safe environment variable access
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is required');
}

// Optional with default
const rateLimit = parseInt(process.env.RATE_LIMIT || '50');

// Boolean environment variables
const isDevelopment = process.env.NODE_ENV === 'development';
```

---

## 🧪 Testing Patterns

### **1. Test Setup Pattern**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock external dependencies
vi.mock('../openai.server', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }
}));

describe('Service Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should handle valid input', async () => {
    const result = await serviceFunction(validInput);
    expect(result).toBeDefined();
  });
  
  it('should handle errors gracefully', async () => {
    const result = await serviceFunction(invalidInput);
    expect(result.error).toBeDefined();
  });
});
```

### **2. Mock Pattern**
```typescript
// Mock environment variables
process.env.OPENAI_API_KEY = 'test-key';

// Mock console methods
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
};

// Mock API responses
vi.mocked(openai.chat.completions.create).mockResolvedValue({
  choices: [{ message: { content: 'test response' } }]
});
```

---

## 📊 Data Flow Diagrams

### **Product Analysis Flow**
```
1. User clicks "Analyze" button
   ↓
2. Form submits to action function
   ↓
3. Server validates input data
   ↓
4. Check rate limits
   ↓
5. Check cache for existing analysis
   ↓
6. If not cached: Call OpenAI API
   ↓
7. Transform API response
   ↓
8. Cache result
   ↓
9. Return to UI
   ↓
10. Display analysis results
```

### **Error Handling Flow**
```
Error Occurs
   ↓
Log error details
   ↓
Determine error type
   ↓
Rate limit? → Return 429 status
Network error? → Retry with backoff
Validation error? → Return 400 status
Unknown error? → Return fallback data
   ↓
User sees graceful error message
```

---

## 🔧 Common TypeScript Patterns

### **Type Guards**
```typescript
function isRateLimitError(error: any): error is RateLimitError {
  return error.status === 429 || 
         error.message?.includes('rate limit');
}

function isNetworkError(error: any): boolean {
  return error.code === 'ECONNRESET' || 
         error.code === 'ENOTFOUND';
}
```

### **Utility Types**
```typescript
// Make all properties optional
type PartialProduct = Partial<Product>;

// Pick specific properties
type ProductSummary = Pick<Product, 'id' | 'title'>;

// Exclude properties
type ProductWithoutId = Omit<Product, 'id'>;

// Function return type
type AnalysisResult = ReturnType<typeof analyzeLLMDiscoverability>;
```

### **Generic Functions**
```typescript
function createCache<T>(): Map<string, T> {
  return new Map<string, T>();
}

async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}
```

---

## 🎨 React/UI Patterns

### **State Management**
```typescript
// Simple state
const [isLoading, setIsLoading] = useState(false);

// Complex state
const [formData, setFormData] = useState({
  title: '',
  description: '',
  tags: ''
});

// Update complex state
const updateFormData = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

### **Effect Patterns**
```typescript
// Run once on mount
useEffect(() => {
  fetchData();
}, []);

// Run when dependency changes
useEffect(() => {
  if (productId) {
    analyzeProduct(productId);
  }
}, [productId]);

// Cleanup
useEffect(() => {
  const timer = setInterval(() => {
    checkStatus();
  }, 1000);
  
  return () => clearInterval(timer);
}, []);
```

### **Form Handling**
```typescript
const handleSubmit = (event: React.FormEvent) => {
  event.preventDefault();
  
  const formData = new FormData();
  formData.append("actionType", "analyze");
  formData.append("productId", selectedProduct);
  
  submit(formData, { method: "POST" });
};
```

---

## 🚀 Performance Patterns

### **Memoization**
```typescript
// Expensive calculation
const expensiveValue = useMemo(() => {
  return calculateComplexValue(data);
}, [data]);

// Callback memoization
const handleClick = useCallback(() => {
  onProductSelect(product.id);
}, [product.id, onProductSelect]);
```

### **Lazy Loading**
```typescript
// Dynamic imports
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Conditional loading
const [showAdvanced, setShowAdvanced] = useState(false);
```

---

## 🔍 Debugging Tips

### **Console Patterns**
```typescript
// Structured logging
console.log('🔄 Starting analysis:', {
  productId,
  timestamp: new Date().toISOString(),
  cacheStatus: cached ? 'hit' : 'miss'
});

// Error logging
console.error('❌ Analysis failed:', {
  error: error.message,
  stack: error.stack,
  productTitle,
  timestamp: new Date().toISOString()
});
```

### **Network Debugging**
```typescript
// Log API calls
const response = await fetch(url, options);
console.log('API Response:', {
  url,
  status: response.status,
  headers: Object.fromEntries(response.headers)
});
```

---

## 📚 Key Files Quick Reference

### **`app/types/analysis.ts`**
- **Purpose**: TypeScript interfaces and types
- **Key Concepts**: Data structure definitions
- **Look For**: Interface patterns, optional properties

### **`app/services/error-handler.server.ts`**
- **Purpose**: Error management and fallbacks
- **Key Concepts**: Custom error classes, graceful degradation
- **Look For**: Error inheritance, fallback strategies

### **`app/services/rate-limiter.server.ts`**
- **Purpose**: API rate limiting
- **Key Concepts**: In-memory data structures, time-based algorithms
- **Look For**: Map usage, cleanup strategies

### **`app/services/llm-analysis.server.ts`**
- **Purpose**: Core business logic
- **Key Concepts**: Async operations, caching, API integration
- **Look For**: Retry logic, data transformation, caching

### **`app/routes/app._index.tsx`**
- **Purpose**: Main UI component
- **Key Concepts**: Remix patterns, React hooks, form handling
- **Look For**: Loader/action pattern, state management

### **`app/services/__tests__/llm-analysis.test.ts`**
- **Purpose**: Testing examples
- **Key Concepts**: Mocking, assertions, test structure
- **Look For**: Mock patterns, test organization

---

## 🎯 Study Checklist

### **Phase 1: Foundation (30 min)**
- [ ] Read `package.json` - understand dependencies
- [ ] Review `env.example` - see required services
- [ ] Scan `app/types/analysis.ts` - understand data structures

### **Phase 2: Core Patterns (1 hour)**
- [ ] Study error handling in `error-handler.server.ts`
- [ ] Understand caching in `llm-analysis.server.ts`
- [ ] Learn rate limiting in `rate-limiter.server.ts`

### **Phase 3: UI Integration (1 hour)**
- [ ] Trace form submission in `app._index.tsx`
- [ ] Follow loader/action pattern
- [ ] Understand state management

### **Phase 4: Testing (30 min)**
- [ ] Review test structure
- [ ] Understand mocking patterns
- [ ] Practice writing tests

---

## 🚨 Common Gotchas

### **TypeScript**
- **Non-null assertion (`!`)**: Only use when you're 100% sure
- **Optional chaining (`?.`)**: Safe property access
- **Type assertions (`as`)**: Use sparingly, prefer type guards

### **Async/Await**
- **Always handle errors**: Use try-catch or .catch()
- **Don't forget await**: Async functions return promises
- **Parallel vs Sequential**: Use Promise.all() for parallel operations

### **React/Remix**
- **Server vs Client**: Loaders/actions run on server
- **State updates**: Use functional updates for complex state
- **Effect dependencies**: Always include all dependencies

### **Environment Variables**
- **Never commit secrets**: Use .env files, not hardcoded values
- **Validate required vars**: Check for existence at startup
- **Type conversion**: process.env values are always strings

---

## 💡 Pro Tips

1. **Start Small**: Understand one pattern completely before moving on
2. **Use Debugger**: Set breakpoints to see data flow
3. **Console.log Everything**: When learning, log intermediate values
4. **Read Error Messages**: They often tell you exactly what's wrong
5. **Test Your Understanding**: Try to explain patterns in your own words

---

**Happy Learning! 🚀**

*Keep this guide handy while studying the code. Focus on understanding patterns rather than memorizing syntax.* 