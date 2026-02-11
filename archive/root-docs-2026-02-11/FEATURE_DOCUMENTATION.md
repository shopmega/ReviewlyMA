# Avis.ma Feature Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Advertising System](#advertising-system)
3. [Premium Placement Features](#premium-placement-features)
4. [Support Ticket System](#support-ticket-system)
5. [Content Pinning Feature](#content-pinning-feature)
6. [Competitor Advertisement System](#competitor-advertisement-system)
7. [Review Page Improvements](#review-page-improvements)
8. [Enhanced Rating Dimensions](#enhanced-rating-dimensions)

## Introduction

This document provides comprehensive documentation for the new features implemented in the Avis.ma platform to bridge the gap between marketing promises and actual functionality. These features enhance the platform's monetization capabilities and user experience.

## Advertising System

### Overview
The advertising system allows premium users to create and manage ad campaigns to promote their businesses. It includes features for budget management, scheduling, and performance tracking.

### Features
- Create ad campaigns with title, content, and budget
- Schedule ad start and end dates
- Track spending against budget
- Manage ad status (draft, active, paused, completed)
- View campaign analytics

### Components
- `Ad` type definition with properties like title, content, budget, status, etc.
- Server actions for CRUD operations on ads
- Dashboard page for managing campaigns
- Ad component for displaying ads on business pages

### Implementation Details
- Database table: `ads`
- Server actions: `createAd`, `updateAd`, `deleteAd`, `getAdById`, `getUserAds`, `toggleAdStatus`
- Frontend: `/dashboard/advertising` page with tabs for management, creation, and analytics

## Premium Placement Features

### Overview
Enhanced search algorithm with premium placement capabilities to provide better visibility for premium businesses.

### Features
- Sponsored results section
- Priority placement based on subscription tier
- Enhanced search UI with visual indicators for sponsored content
- Analytics for placement performance

### Implementation Details
- Modified search algorithm in `src/lib/data.ts` to prioritize sponsored content
- Added `is_sponsored` column to businesses table
- Created `SponsoredResults` component for displaying premium placements
- Added advertising dashboard at `/dashboard/advertising`

## Support Ticket System

### Overview
A comprehensive support ticket system for premium users to get enhanced customer support.

### Features
- Create support tickets with subject, message, category, and priority
- Track ticket status (open, in_progress, resolved, closed)
- Assign tickets to support staff
- Resolution notes for closed tickets
- User dashboard for managing tickets

### Components
- `SupportTicket` type definition
- Server actions for ticket management
- Support page for creating and viewing tickets
- Admin panel for managing all tickets

### Implementation Details
- Database table: `support_tickets`
- Server actions: `createSupportTicket`, `updateSupportTicket`, `closeSupportTicket`, `getSupportTicketById`, `getUserTickets`, `assignTicket`, `resolveTicket`, `getAllTickets`
- Frontend: `/support` page for users and admin panels for staff

## Content Pinning Feature

### Overview
Allows premium businesses to pin important content to their business profiles for enhanced visibility.

### Features
- Create pinned content with title, description, and media
- Activate/deactivate pinned content
- Attach media URLs to pinned content
- Manage pinned content from business dashboard

### Components
- `PinnedContent` type definition
- Server actions for pinning management
- Pinned content component for business pages
- Dashboard for managing pinned content

### Implementation Details
- Database table: `pinned_content`
- Server actions: `createPinnedContent`, `updatePinnedContent`, `deletePinnedContent`, `getPinnedContentById`, `getPinnedContentByBusiness`, `togglePinnedContentStatus`, `getUserPinnedContent`
- Frontend: `/dashboard/pinned-content` page and `PinnedContent` component

## Competitor Advertisement System

### Overview
A unique feature allowing businesses to place ads on their competitors' business pages, increasing visibility among target audiences.

### Features
- Create competitor-targeted ad campaigns
- Specify target competitor business IDs
- Set budgets and scheduling for competitor ads
- Track performance of competitor placements
- Manage competitor ad campaigns from dashboard

### Components
- `CompetitorAd` type definition
- Server actions for competitor ad management
- Competitor ads component for displaying on business pages
- Dashboard for managing competitor campaigns

### Implementation Details
- Database table: `competitor_ads`
- Server actions: `createCompetitorAd`, `updateCompetitorAd`, `deleteCompetitorAd`, `getCompetitorAdById`, `getCompetitorAdsByBusiness`, `toggleCompetitorAdStatus`, `getActiveCompetitorAdsForBusiness`, `getUserCompetitorAds`
- Frontend: `/dashboard/competitor-ads` page and `CompetitorAds` component

## Review Page Improvements

### Overview
Enhanced review page with pagination, filtering, and sorting capabilities to improve performance and user experience.

### Features
- Pagination with navigation controls
- Search functionality for finding businesses
- Category filtering
- Multiple sorting options (relevance, rating, reviews, newest)
- Loading states and skeleton UI
- Responsive design

### Implementation Details
- Updated `/review` page with pagination and filtering
- Added category and sorting dropdowns
- Implemented skeleton loading components
- Used `getFilteredBusinesses` for paginated data
- Added proper TypeScript typing for paginated results

## Enhanced Rating Dimensions

### Overview
Expanded rating system with additional dimensions to provide more detailed feedback about businesses.

### New Rating Dimensions
- Details (optionnel)
- Service
- Quality
- Value for Money (Q/P)
- Ambiance

### Features
- Additional rating fields in review form
- Display of sub-ratings in review cards
- Sorting options based on different rating dimensions
- Enhanced review form with additional inputs

### Implementation Details
- Extended `Review` type with new sub-rating fields
- Updated `reviewSchema` with new sub-rating validations
- Modified `ReviewForm` to include new rating dimensions
- Added sorting options in `ReviewsSection` for each rating dimension
- Updated `SubRatingInput` component for consistent UI

## Database Schema Changes

### New Tables
1. `ads` - Stores advertising campaign information
2. `support_tickets` - Manages support requests
3. `pinned_content` - Stores pinned content for businesses
4. `competitor_ads` - Handles competitor advertisement campaigns

### Modified Tables
1. `businesses` - Added `is_sponsored` column
2. `reviews` - Enhanced with additional sub-rating fields

## Security & Access Control

### Row Level Security (RLS)
All new tables implement proper RLS policies:
- Users can only access their own ads, tickets, and pinned content
- Business owners can only manage content for their businesses
- Admins have full access to all records via service role

### Authentication
- All server actions verify user authentication
- Permission checks ensure users can only modify content they own
- Proper error handling for unauthorized access attempts

## User Experience

### Dashboard Integration
All new features are accessible through the user dashboard with intuitive interfaces:
- Advertising management under `/dashboard/advertising`
- Pinned content management under `/dashboard/pinned-content`
- Competitor ads under `/dashboard/competitor-ads`
- Support tickets accessible from header or `/support`

### Mobile Responsiveness
All new features are designed with mobile-first approach ensuring optimal experience across devices.

## Monetization Impact

These new features directly address the marketing promises by providing:
- Actual ad removal functionality for premium users
- Enhanced placement visibility for premium businesses
- Dedicated support channels for premium customers
- Content pinning capabilities for highlighting important information
- Cross-promotion opportunities through competitor ads
- More detailed feedback through expanded rating dimensions