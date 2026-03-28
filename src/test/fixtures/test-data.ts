/**
 * Test data fixtures for comprehensive testing
 * Provides realistic mock data for all test scenarios
 */

export const mockUsers = {
  regularUser: {
    id: 'user-regular-1',
    email: 'regular@example.com',
    full_name: 'Regular User',
    role: 'user',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  businessOwner: {
    id: 'user-business-1',
    email: 'owner@example.com',
    full_name: 'Business Owner',
    role: 'business_owner',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  admin: {
    id: 'user-admin-1',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin',
    admin_access_level: 'full',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  premiumUser: {
    id: 'user-premium-1',
    email: 'premium@example.com',
    full_name: 'Premium User',
    role: 'premium',
    subscription_tier: 'pro',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const mockBusinesses = {
  cafeRabat: {
    id: 'cafe-rabat-1',
    name: 'Café de Rabat',
    slug: 'cafe-de-rabat',
    description: 'Traditional Moroccan café with authentic atmosphere',
    category: 'restaurant',
    subcategory: 'cafe',
    city: 'Rabat',
    address: '123 Rue des Consuls, Rabat',
    phone: '+212-537-123-456',
    email: 'info@caferabat.ma',
    website: 'https://caferabat.ma',
    rating: 4.5,
    review_count: 128,
    status: 'verified',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  techStartup: {
    id: 'tech-startup-1',
    name: 'TechInnovate',
    slug: 'techinnovate',
    description: 'Innovative technology startup specializing in AI solutions',
    category: 'technology',
    subcategory: 'software',
    city: 'Casablanca',
    address: "456 Boulevard d'Anfa, Casablanca",
    phone: '+212-522-987-654',
    email: 'contact@techinnovate.ma',
    website: 'https://techinnovate.ma',
    rating: 4.2,
    review_count: 45,
    status: 'verified',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  unverifiedBusiness: {
    id: 'unverified-1',
    name: 'Unverified Shop',
    slug: 'unverified-shop',
    description: 'A business that has not been verified yet',
    category: 'retail',
    subcategory: 'general',
    city: 'Marrakech',
    address: '789 Avenue Mohammed V, Marrakech',
    phone: '+212-524-555-123',
    email: 'info@unverifiedshop.ma',
    rating: 3.8,
    review_count: 12,
    status: 'pending',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const mockReviews = {
  positiveReview: {
    id: 'review-positive-1',
    business_id: mockBusinesses.cafeRabat.id,
    user_id: mockUsers.regularUser.id,
    rating: 5,
    title: 'Excellent café!',
    content: 'Amazing atmosphere and great coffee. Highly recommended!',
    pros: 'Great coffee, friendly staff, authentic atmosphere',
    cons: 'Can get crowded during peak hours',
    would_recommend: true,
    status: 'approved',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  criticalReview: {
    id: 'review-critical-1',
    business_id: mockBusinesses.techStartup.id,
    user_id: mockUsers.businessOwner.id,
    rating: 2,
    title: 'Disappointing experience',
    content: 'Service was slow and the product didn\'t meet expectations.',
    pros: 'Modern office space',
    cons: 'Poor customer service, overpriced',
    would_recommend: false,
    status: 'approved',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  pendingReview: {
    id: 'review-pending-1',
    business_id: mockBusinesses.unverifiedBusiness.id,
    user_id: mockUsers.premiumUser.id,
    rating: 4,
    title: 'Good but needs improvement',
    content: 'Decent place but could be better.',
    pros: 'Good location, reasonable prices',
    cons: 'Limited parking, slow service',
    would_recommend: true,
    status: 'pending',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const mockSalaries = {
  techSalary: {
    id: 'salary-tech-1',
    business_id: mockBusinesses.techStartup.id,
    user_id: mockUsers.regularUser.id,
    job_title: 'Senior Software Engineer',
    department: 'Engineering',
    experience_years: 5,
    salary_monthly: 25000,
    salary_currency: 'MAD',
    bonus_monthly: 5000,
    benefits: 'Health insurance, stock options, flexible hours',
    work_location: 'Casablanca',
    work_type: 'hybrid',
    status: 'verified',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  serviceSalary: {
    id: 'salary-service-1',
    business_id: mockBusinesses.cafeRabat.id,
    user_id: mockUsers.businessOwner.id,
    job_title: 'Café Manager',
    department: 'Operations',
    experience_years: 3,
    salary_monthly: 8000,
    salary_currency: 'MAD',
    bonus_monthly: 1000,
    benefits: 'Free meals, transportation allowance',
    work_location: 'Rabat',
    work_type: 'onsite',
    status: 'verified',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const mockCategories = [
  {
    id: 'cat-restaurant',
    name: 'Restaurant',
    slug: 'restaurant',
    description: 'Restaurants and food establishments',
    icon: 'utensils',
    subcategories: [
      { id: 'sub-cafe', name: 'Café', slug: 'cafe' },
      { id: 'sub-fine-dining', name: 'Fine Dining', slug: 'fine-dining' },
      { id: 'sub-fast-food', name: 'Fast Food', slug: 'fast-food' },
    ],
  },
  {
    id: 'cat-technology',
    name: 'Technology',
    slug: 'technology',
    description: 'Technology companies and services',
    icon: 'laptop',
    subcategories: [
      { id: 'sub-software', name: 'Software', slug: 'software' },
      { id: 'sub-hardware', name: 'Hardware', slug: 'hardware' },
      { id: 'sub-consulting', name: 'IT Consulting', slug: 'consulting' },
    ],
  },
  {
    id: 'cat-retail',
    name: 'Retail',
    slug: 'retail',
    description: 'Retail stores and shops',
    icon: 'shopping-bag',
    subcategories: [
      { id: 'sub-clothing', name: 'Clothing', slug: 'clothing' },
      { id: 'sub-electronics', name: 'Electronics', slug: 'electronics' },
      { id: 'sub-general', name: 'General Store', slug: 'general' },
    ],
  },
];

export const mockSubscriptions = {
  freeTier: {
    id: 'sub-free',
    name: 'Free',
    slug: 'free',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      'Basic business profile',
      'Up to 3 reviews',
      'Basic search visibility',
    ],
    limits: {
      businesses: 1,
      reviews: 3,
      salary_reports: 0,
    },
  },
  proTier: {
    id: 'sub-pro',
    name: 'Professional',
    slug: 'pro',
    price_monthly: 99,
    price_yearly: 990,
    features: [
      'Advanced business profile',
      'Unlimited reviews',
      'Priority search visibility',
      'Salary insights',
      'Analytics dashboard',
    ],
    limits: {
      businesses: 5,
      reviews: -1, // unlimited
      salary_reports: 50,
    },
  },
  enterpriseTier: {
    id: 'sub-enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    price_monthly: 299,
    price_yearly: 2990,
    features: [
      'Everything in Pro',
      'Unlimited businesses',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
    limits: {
      businesses: -1, // unlimited
      reviews: -1,
      salary_reports: -1,
    },
  },
};

export const mockAuthSessions = {
  regularUserSession: {
    user: mockUsers.regularUser,
    access_token: 'mock-access-token-regular',
    refresh_token: 'mock-refresh-token-regular',
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
  },
  businessOwnerSession: {
    user: mockUsers.businessOwner,
    access_token: 'mock-access-token-business',
    refresh_token: 'mock-refresh-token-business',
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  },
  adminSession: {
    user: mockUsers.admin,
    access_token: 'mock-access-token-admin',
    refresh_token: 'mock-refresh-token-admin',
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  },
  premiumUserSession: {
    user: mockUsers.premiumUser,
    access_token: 'mock-access-token-premium',
    refresh_token: 'mock-refresh-token-premium',
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  },
};

export const mockApiResponses = {
  success: {
    status: 'success',
    data: {},
    message: 'Operation completed successfully',
  },
  error: {
    status: 'error',
    data: null,
    message: 'Operation failed',
  },
  validationError: {
    status: 'error',
    data: null,
    message: 'Validation failed',
    errors: [],
  },
  unauthorized: {
    status: 'error',
    data: null,
    message: 'Unauthorized access',
  },
  forbidden: {
    status: 'error',
    data: null,
    message: 'Access forbidden',
  },
  notFound: {
    status: 'error',
    data: null,
    message: 'Resource not found',
  },
};

// Utility functions for creating test data variations
export const createMockBusiness = (overrides = {}) => ({
  ...mockBusinesses.cafeRabat,
  id: `business-${Date.now()}`,
  slug: `business-${Date.now()}`,
  ...overrides,
});

export const createMockReview = (overrides = {}) => ({
  ...mockReviews.positiveReview,
  id: `review-${Date.now()}`,
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  ...mockUsers.regularUser,
  id: `user-${Date.now()}`,
  email: `user-${Date.now()}@example.com`,
  ...overrides,
});

export const createMockSalary = (overrides = {}) => ({
  ...mockSalaries.techSalary,
  id: `salary-${Date.now()}`,
  ...overrides,
});

// Test scenarios data
export const testScenarios = {
  // Authentication scenarios
  auth: {
    validLogin: {
      email: mockUsers.regularUser.email,
      password: 'ValidPassword123!',
    },
    invalidLogin: {
      email: mockUsers.regularUser.email,
      password: 'WrongPassword123!',
    },
    nonExistentUser: {
      email: 'nonexistent@example.com',
      password: 'SomePassword123!',
    },
  },
  
  // Business search scenarios
  search: {
    byKeyword: {
      keyword: 'café',
      city: '',
      category: '',
    },
    byCity: {
      keyword: '',
      city: 'Rabat',
      category: '',
    },
    byCategory: {
      keyword: '',
      city: '',
      category: 'restaurant',
    },
    combined: {
      keyword: 'restaurant',
      city: 'Rabat',
      category: 'restaurant',
    },
    empty: {
      keyword: '',
      city: '',
      category: '',
    },
  },
  
  // Review scenarios
  reviews: {
    validReview: {
      rating: 5,
      title: 'Great experience!',
      content: 'Really enjoyed my visit',
      pros: 'Great service, good food',
      cons: 'A bit pricey',
      would_recommend: true,
    },
    invalidReview: {
      rating: 0,
      title: '',
      content: '',
      pros: '',
      cons: '',
      would_recommend: false,
    },
    edgeCaseReview: {
      rating: 3,
      title: 'A'.repeat(200), // Too long
      content: 'B'.repeat(2000), // Too long
      pros: 'C'.repeat(500),
      cons: 'D'.repeat(500),
      would_recommend: true,
    },
  },
};
