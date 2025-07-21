# 🏗️ Foundations - Essential Knowledge Before Code Study

## 🎯 Purpose
This guide ensures you have **solid foundational knowledge** before diving into the main study guide. Complete this first to set yourself up for success.

---

## 📚 Learning Path Overview

### **Phase 1: JavaScript Mastery (2-3 hours)**
### **Phase 2: TypeScript Fundamentals (1-2 hours)**
### **Phase 3: React & Hooks (1-2 hours)**
### **Phase 4: Node.js & Server Concepts (1 hour)**
### **Phase 5: Modern Development Patterns (1 hour)**

**Total Time Investment: 6-9 hours**

---

## 🚀 Phase 1: JavaScript Mastery

### **1.1 ES6+ Features You Must Know**

#### **Destructuring**
```javascript
// Object destructuring
const user = { name: 'John', age: 30, email: 'john@example.com' };
const { name, age } = user;
console.log(name); // 'John'

// Array destructuring
const colors = ['red', 'green', 'blue'];
const [first, second] = colors;
console.log(first); // 'red'

// Nested destructuring
const product = {
  info: { title: 'Snowboard', price: 299 },
  tags: ['winter', 'sports']
};
const { info: { title }, tags: [firstTag] } = product;
```

#### **Arrow Functions**
```javascript
// Traditional function
function add(a, b) {
  return a + b;
}

// Arrow function
const add = (a, b) => a + b;

// With multiple statements
const processUser = (user) => {
  const formatted = user.name.toUpperCase();
  return { ...user, name: formatted };
};

// Array methods with arrows
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
```

#### **Template Literals**
```javascript
const name = 'John';
const age = 30;

// Instead of: 'Hello, ' + name + '! You are ' + age + ' years old.'
const message = `Hello, ${name}! You are ${age} years old.`;

// Multi-line strings
const html = `
  <div>
    <h1>${title}</h1>
    <p>${description}</p>
  </div>
`;
```

#### **Spread Operator**
```javascript
// Arrays
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]

// Objects
const user = { name: 'John', age: 30 };
const updatedUser = { ...user, age: 31 }; // { name: 'John', age: 31 }

// Function arguments
const numbers = [1, 2, 3];
Math.max(...numbers); // Same as Math.max(1, 2, 3)
```

#### **Optional Chaining**
```javascript
const user = {
  profile: {
    social: {
      twitter: '@john'
    }
  }
};

// Instead of: user.profile && user.profile.social && user.profile.social.twitter
const twitter = user.profile?.social?.twitter;
const instagram = user.profile?.social?.instagram ?? 'Not provided';
```

### **1.2 Promises and Async/Await**

#### **Understanding Promises**
```javascript
// Creating a promise
const fetchData = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = Math.random() > 0.5;
      if (success) {
        resolve({ data: 'Success!' });
      } else {
        reject(new Error('Failed to fetch'));
      }
    }, 1000);
  });
};

// Using promises
fetchData()
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

#### **Async/Await**
```javascript
// Converting promise chains to async/await
async function getData() {
  try {
    const result = await fetchData();
    console.log(result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error; // Re-throw if needed
  }
}

// Multiple async operations
async function fetchUserAndPosts(userId) {
  try {
    // Sequential (one after another)
    const user = await fetchUser(userId);
    const posts = await fetchPosts(userId);
    
    // Parallel (at the same time)
    const [userParallel, postsParallel] = await Promise.all([
      fetchUser(userId),
      fetchPosts(userId)
    ]);
    
    return { user, posts };
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}
```

### **1.3 Array Methods**
```javascript
const products = [
  { id: 1, name: 'Snowboard', price: 299, category: 'winter' },
  { id: 2, name: 'Skateboard', price: 89, category: 'summer' },
  { id: 3, name: 'Surfboard', price: 459, category: 'summer' }
];

// map - transform each item
const names = products.map(product => product.name);

// filter - select items that match condition
const winterProducts = products.filter(product => product.category === 'winter');

// find - get first item that matches
const expensive = products.find(product => product.price > 400);

// reduce - accumulate into single value
const totalPrice = products.reduce((sum, product) => sum + product.price, 0);

// some - check if any item matches
const hasExpensive = products.some(product => product.price > 400);

// every - check if all items match
const allAffordable = products.every(product => product.price < 500);
```

### **✅ Phase 1 Checkpoint**
Can you confidently:
- [ ] Destructure objects and arrays?
- [ ] Write arrow functions?
- [ ] Use template literals?
- [ ] Spread objects and arrays?
- [ ] Use optional chaining?
- [ ] Work with async/await?
- [ ] Use array methods (map, filter, reduce)?

---

## 🔷 Phase 2: TypeScript Fundamentals

### **2.1 Basic Types**
```typescript
// Primitive types
let name: string = 'John';
let age: number = 30;
let isActive: boolean = true;
let data: any = { anything: 'goes here' };

// Arrays
let numbers: number[] = [1, 2, 3];
let names: Array<string> = ['John', 'Jane'];

// Union types
let id: string | number = 123;
id = 'abc'; // Also valid

// Literal types
let status: 'loading' | 'success' | 'error' = 'loading';
```

### **2.2 Interfaces**
```typescript
// Define object shape
interface User {
  id: number;
  name: string;
  email?: string; // Optional property
  readonly createdAt: Date; // Read-only
}

// Use interface
const user: User = {
  id: 1,
  name: 'John',
  createdAt: new Date()
};

// Extending interfaces
interface AdminUser extends User {
  permissions: string[];
}

// Interface for functions
interface Calculator {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
}
```

### **2.3 Functions**
```typescript
// Function with types
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Optional parameters
function createUser(name: string, age?: number): User {
  return {
    id: Date.now(),
    name,
    age: age || 0,
    createdAt: new Date()
  };
}

// Default parameters
function fetchData(url: string, timeout: number = 5000): Promise<any> {
  // Implementation
}

// Arrow function with types
const multiply = (a: number, b: number): number => a * b;
```

### **2.4 Generics**
```typescript
// Generic function
function identity<T>(arg: T): T {
  return arg;
}

const stringResult = identity<string>('hello');
const numberResult = identity<number>(42);

// Generic interface
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const userResponse: ApiResponse<User> = {
  data: { id: 1, name: 'John', createdAt: new Date() },
  status: 200,
  message: 'Success'
};

// Generic array
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

### **2.5 Type Guards**
```typescript
// Type guard function
function isString(value: any): value is string {
  return typeof value === 'string';
}

// Using type guards
function processValue(value: string | number) {
  if (isString(value)) {
    // TypeScript knows value is string here
    console.log(value.toUpperCase());
  } else {
    // TypeScript knows value is number here
    console.log(value.toFixed(2));
  }
}
```

### **✅ Phase 2 Checkpoint**
Can you confidently:
- [ ] Define interfaces for objects?
- [ ] Use union types?
- [ ] Write typed functions?
- [ ] Understand optional properties?
- [ ] Use basic generics?
- [ ] Create type guards?

---

## ⚛️ Phase 3: React & Hooks

### **3.1 Component Basics**
```typescript
// Functional component
interface Props {
  title: string;
  count?: number;
}

const Counter: React.FC<Props> = ({ title, count = 0 }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
    </div>
  );
};

// Using the component
<Counter title="My Counter" count={5} />
```

### **3.2 useState Hook**
```typescript
import { useState } from 'react';

const UserProfile = () => {
  // Simple state
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<number>(0);
  
  // Object state
  const [user, setUser] = useState<User>({
    id: 0,
    name: '',
    createdAt: new Date()
  });
  
  // Update object state
  const updateUserName = (newName: string) => {
    setUser(prevUser => ({
      ...prevUser,
      name: newName
    }));
  };
  
  return (
    <div>
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );
};
```

### **3.3 useEffect Hook**
```typescript
import { useEffect, useState } from 'react';

const DataFetcher = ({ userId }: { userId: number }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Run once on mount
  useEffect(() => {
    console.log('Component mounted');
    
    // Cleanup function
    return () => {
      console.log('Component unmounted');
    };
  }, []);
  
  // Run when userId changes
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const userData = await api.getUser(userId);
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [userId]);
  
  // Cleanup with intervals
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Polling...');
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return <div>{user?.name}</div>;
};
```

### **3.4 Event Handling**
```typescript
const FormComponent = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleInputChange}
      />
      <input
        name="email"
        value={formData.email}
        onChange={handleInputChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### **✅ Phase 3 Checkpoint**
Can you confidently:
- [ ] Create functional components with TypeScript?
- [ ] Use useState for different data types?
- [ ] Use useEffect for side effects?
- [ ] Handle form events?
- [ ] Update state immutably?

---

## 🖥️ Phase 4: Node.js & Server Concepts

### **4.1 Modules and Imports**
```typescript
// Named exports
export const API_URL = 'https://api.example.com';
export function formatDate(date: Date): string {
  return date.toISOString();
}

// Default export
export default class ApiClient {
  constructor(private baseUrl: string) {}
  
  async get(endpoint: string) {
    // Implementation
  }
}

// Importing
import ApiClient, { API_URL, formatDate } from './api-client';
import { useState, useEffect } from 'react';
```

### **4.2 Environment Variables**
```typescript
// Reading environment variables
const apiKey = process.env.OPENAI_API_KEY;
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Validation
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is required');
}

// Type conversion
const maxRetries = parseInt(process.env.MAX_RETRIES || '3');
const enableLogging = process.env.ENABLE_LOGGING === 'true';
```

### **4.3 Error Handling**
```typescript
// Custom error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handling patterns
async function processData(data: any) {
  try {
    validateData(data);
    const result = await apiCall(data);
    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message);
      return { error: 'Invalid data' };
    }
    
    if (error instanceof ApiError) {
      console.error('API error:', error.message);
      return { error: 'Service unavailable' };
    }
    
    console.error('Unexpected error:', error);
    return { error: 'Something went wrong' };
  }
}
```

### **4.4 Async Patterns**
```typescript
// Timeout pattern
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

// Retry pattern
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### **✅ Phase 4 Checkpoint**
Can you confidently:
- [ ] Import and export modules?
- [ ] Work with environment variables?
- [ ] Create custom error classes?
- [ ] Handle async operations with proper error handling?
- [ ] Understand timeout and retry patterns?

---

## 🏗️ Phase 5: Modern Development Patterns

### **5.1 Data Structures**
```typescript
// Map for key-value pairs
const userCache = new Map<string, User>();
userCache.set('user123', userData);
const user = userCache.get('user123');

// Set for unique values
const uniqueIds = new Set<number>();
uniqueIds.add(1);
uniqueIds.add(2);
uniqueIds.add(1); // Won't add duplicate

// When to use Map vs Object
// Use Map when:
// - Keys are unknown until runtime
// - Keys are not strings
// - Need to iterate frequently
// - Need size property

// Use Object when:
// - Keys are known at compile time
// - Keys are strings
// - Need JSON serialization
```

### **5.2 Caching Patterns**
```typescript
// Simple cache with expiration
class Cache<T> {
  private data = new Map<string, {
    value: T;
    timestamp: number;
  }>();
  
  constructor(private ttlMs: number = 60000) {}
  
  set(key: string, value: T): void {
    this.data.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key: string): T | null {
    const entry = this.data.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.data.delete(key);
      return null;
    }
    
    return entry.value;
  }
}
```

### **5.3 Validation Patterns**
```typescript
// Input validation
function validateUser(user: any): User {
  if (!user || typeof user !== 'object') {
    throw new ValidationError('User must be an object');
  }
  
  if (!user.name || typeof user.name !== 'string') {
    throw new ValidationError('Name is required and must be a string');
  }
  
  if (user.name.length > 100) {
    throw new ValidationError('Name must be less than 100 characters');
  }
  
  if (user.email && typeof user.email !== 'string') {
    throw new ValidationError('Email must be a string');
  }
  
  return {
    id: user.id || Date.now(),
    name: user.name,
    email: user.email,
    createdAt: new Date()
  };
}
```

### **5.4 Rate Limiting Concepts**
```typescript
// Simple rate limiter
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
}
```

### **✅ Phase 5 Checkpoint**
Can you confidently:
- [ ] Choose between Map and Object appropriately?
- [ ] Implement basic caching?
- [ ] Validate input data?
- [ ] Understand rate limiting concepts?

---

## 🎯 Final Readiness Check

### **Knowledge Assessment**
Rate your confidence (1-5) in each area:

**JavaScript Fundamentals:**
- [ ] Destructuring and spread operator
- [ ] Arrow functions and template literals
- [ ] Async/await and Promise handling
- [ ] Array methods (map, filter, reduce)

**TypeScript:**
- [ ] Interfaces and type definitions
- [ ] Union types and optional properties
- [ ] Generic functions and types
- [ ] Type guards

**React:**
- [ ] Functional components with TypeScript
- [ ] useState and useEffect hooks
- [ ] Event handling and forms
- [ ] Component lifecycle

**Node.js/Server:**
- [ ] Module imports/exports
- [ ] Environment variables
- [ ] Error handling patterns
- [ ] Async patterns and error recovery

**Modern Patterns:**
- [ ] Data structures (Map, Set)
- [ ] Caching strategies
- [ ] Input validation
- [ ] Rate limiting concepts

### **Minimum Requirements**
You should score **3 or higher** in all areas before proceeding to the main study guide.

### **If You Need More Practice:**
- **JavaScript**: Practice on [JavaScript.info](https://javascript.info/)
- **TypeScript**: Work through [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- **React**: Build a simple todo app with hooks
- **Node.js**: Create a simple API server

---

## 🚀 Next Steps

Once you've completed this foundation:

1. **✅ You're ready for**: `STUDY_GUIDE.md` - The comprehensive code analysis
2. **📖 Keep handy**: `OFFLINE_REFERENCE.md` - Quick pattern reference
3. **🔧 Start with**: `package.json` and `app/types/analysis.ts`

---

## 💡 Study Tips

1. **Don't rush**: Solid foundations save time later
2. **Practice typing**: Write code examples yourself
3. **Test understanding**: Explain concepts out loud
4. **Ask questions**: What would happen if...?
5. **Build something**: Apply concepts in a small project

---

**Ready to become a better developer? 🚀**

*Master these foundations, and the main codebase will make perfect sense!* 