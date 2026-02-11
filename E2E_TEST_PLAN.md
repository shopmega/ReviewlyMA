# E2E User Flow & Feature Review Plan

This document outlines the core user journeys we will verify to ensure the recent UI/UX Redesign hasn't introduced functional regressions and to identify areas for the next phase of development.

## 1. Guest Discovery Flow (The "Shopper")
- [ ] **Landing Page**: Verify Hero interactions, Search input, and "Bento Grid" searching.
- [ ] **Search Results**: Verify the `/businesses` listing page, filters (if any), and pagination.
- [ ] **Business Details**: Verify information accuracy (Map, Hours, Info) and "Reviews" tab visibility.
- [ ] **Navigation**: Verify Header/Footer links and responsiveness.

## 2. Community Interaction Flow (The "Reviewer")
- [ ] **Write Review Entry**: Click "Write a Review" from Home and Business Page.
- [ ] **Authentication Gate**: Verify redirect to Login/Register when attempting actions.
- [ ] **User Profile**: access `/profile` (mocked/if logged in) and check "My Reviews" and "Saved Places".

## 3. Business Pro Flow (The "Owner")
- [ ] **Pro Landing**: Verify `/pour-les-pros` (Landing page for businesses).
- [ ] **Claim Flow**: Click "Claim this page" on a business.
- [ ] **Dashboard Access**: Check status of `/dashboard` (Business Owner Portal).
    - *Note: We suspect this area still needs the "Premium" redesign.*

## Status Log
* **Date**: 2026-01-06
* **Build**: Premium UI Redesign (Phase 2 Complete)
