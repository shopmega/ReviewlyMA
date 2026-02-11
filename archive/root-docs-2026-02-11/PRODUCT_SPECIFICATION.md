# CityGuide Application - Product Specification

## Overview
CityGuide is a Next.js web application that serves as a local business directory and review platform for Moroccan cities. Users can discover businesses, read reviews, and find local services across various categories.

## Core Features

### 1. Homepage
- Hero section with search functionality
- Statistics display (business count, review count)
- Seasonal collections showcase
- Category browsing carousel
- City exploration section
- Featured businesses display

### 2. Search & Discovery
- Location-based search (by city)
- Category filtering
- Keyword search for businesses
- Autocomplete search suggestions
- Popular search terms display

### 3. Business Directory
- Business listings with ratings
- Detailed business profiles
- Reviews and ratings system
- Business categorization
- Location information

### 4. Categories
- Restaurants & Cafés
- Hotels & Accommodations
- Beauty Salons
- Health & Wellness
- Auto Services
- Home Services
- Shopping & Boutiques
- Activities & Leisure

### 5. Cities Coverage
- Casablanca
- Rabat
- Marrakech
- Tangier
- Other Moroccan cities

## Technical Architecture

### Frontend
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **State Management**: React hooks
- **Carousel**: Embla Carousel

### Backend/Data
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Real-time
- **Caching**: In-memory caching

### Key Pages
1. `/` - Homepage
2. `/businesses` - Business listings
3. `/businesses/[id]` - Individual business page
4. `/categories` - Category browsing
5. `/dashboard` - User dashboard
6. `/login` & `/signup` - Authentication
7. `/review` - Review submission
8. Various city and category specific pages

## User Flows

### Primary User Journey
1. User lands on homepage
2. Uses search bar to find businesses
3. Browses categories or collections
4. Clicks on business to view details
5. Reads reviews and ratings
6. Optionally submits review

### Secondary Journeys
- Browse by city
- Filter by category
- View featured businesses
- Access user dashboard
- Claim business listing

## Testing Requirements

### Functional Tests
- Homepage loads correctly
- Search functionality works
- Category filtering functions
- Business cards display properly
- Navigation between pages
- Responsive design on mobile/desktop

### Performance Tests
- Page load times
- Search response times
- Image loading optimization
- Carousel smoothness

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- Focus indicators

### Cross-browser Tests
- Chrome, Firefox, Safari, Edge
- Mobile browser compatibility
- Different viewport sizes

## Expected Behaviors

### Critical Paths
1. **Search Flow**: User searches → Results display → Business details accessible
2. **Browse Flow**: User navigates categories → Businesses listed → Details viewable
3. **Review Flow**: User views business → Sees reviews → Can submit review

### Edge Cases
- Empty search results
- No businesses in category
- Slow network conditions
- Large dataset handling

## Success Metrics
- Page load time < 3 seconds
- Search response < 1 second
- 95% uptime
- Mobile-friendly design
- WCAG AA compliance

## Integration Points
- Supabase API endpoints
- Image storage and delivery
- Authentication flows
- Real-time updates
- External map services