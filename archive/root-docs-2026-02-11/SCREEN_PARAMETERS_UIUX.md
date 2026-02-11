# AVIS.ma - Screen Parameters for UI/UX Enhancement

**Objective:** Clean, organized layouts with minimal clutter for improved UI/UX

---

## 1. Homepage (`/`)

### Parameters:
- **Layout:** Hero + Collections Carousel + Featured Businesses + Categories
- **Data:** `seasonalCollections`, `featuredBusinesses`, `siteSettings`
- **UI Components:** 
  - Hero banner with search
  - Embla carousel for collections
  - Business cards grid (3-col desktop, 1-col mobile)
  - Category filter pills

### Current Issues:
- UI clutter in category section
- Carousel navigation could be cleaner

### Enhancement Focus:
- Simplify category display
- Streamline carousel controls
- Reduce visual noise in business cards

---

## 2. Business Listing (`/businesses`)

### Parameters:
- **Layout:** Filter sidebar (sticky) + Results grid
- **Filters:** Search, Type, Category, Location, Price Range, Sort
- **Data:** `businesses[]`, filter states
- **UI Components:**
  - Collapsible filter sidebar
  - Business cards with rating/location
  - Search input with real-time filtering
  - Sort dropdown

### Current Issues:
- Filter sidebar may feel cluttered
- Too many filter options visible at once

### Enhancement Focus:
- Organize filters in collapsible sections
- Prioritize most-used filters
- Clean up mobile filter experience

---

## 3. Business Detail (`/businesses/[slug]`)

### Parameters:
- **Layout:** Header + Gallery + Tabs (Avis/Détails/Salaires/Entretiens/Horaires)
- **Data:** `business`, `reviews[]`, `photos[]`, `hours[]`
- **UI Components:**
  - Business header (logo, name, rating)
  - Photo gallery carousel/grid
  - Tab navigation
  - Review cards with subratings
  - Hours display

### Current Issues:
- Tab content may feel dense
- Review display could be cleaner

### Enhancement Focus:
- Streamline tab content spacing
- Simplify review card design
- Improve hours display clarity

---

## 4. Review Submission (`/review` → `/businesses/[slug]/review`)

### Parameters:
- **Layout:** Search + Form
- **Form Fields:** Rating, Subratings, Title, Content, Anonymous toggle
- **Data:** `businessId`, form validation
- **UI Components:**
  - Star rating selector
  - Subrating sliders
  - Form validation feedback
  - Submit button

### Current Issues:
- Rating section may feel complex
- Form validation could be cleaner

### Enhancement Focus:
- Simplify star rating interface
- Streamline form validation display
- Improve subrating input design

---

## 5. Login Page (`/login`)

### Parameters:
- **Layout:** Card with form + social buttons
- **Form Fields:** Email, Password
- **UI Components:**
  - Email/password inputs
  - Social login buttons (disabled)
  - Forgot password link
  - Form error display

### Current Issues:
- Social buttons create visual clutter
- Form validation feedback could be cleaner

### Enhancement Focus:
- Remove or better integrate social buttons
- Simplify error message display
- Streamline form layout

---

## 6. Signup Page (`/signup`)

### Parameters:
- **Layout:** Card with form
- **Form Fields:** Full Name, Email, Password
- **UI Components:**
  - Text inputs with validation
  - Form submission
  - Link to login

### Current Issues:
- Standard form layout, could be more engaging

### Enhancement Focus:
- Simplify form flow
- Improve validation feedback
- Streamline visual design

---

## 7. Dashboard Home (`/dashboard`)

### Parameters:
- **Layout:** Welcome + Stats Cards + Recent Reviews + Quick Actions
- **Data:** `stats`, `recentReviews[]`, `business`
- **UI Components:**
  - Stats cards (3-grid)
  - Recent reviews list
  - Quick action buttons
  - Personalized welcome

### Current Issues:
- Stats cards may feel crowded
- Quick actions could be better organized

### Enhancement Focus:
- Clean up stats card design
- Organize quick actions more intuitively
- Improve visual hierarchy

---

## 8. Reviews Management (`/dashboard/reviews`)

### Parameters:
- **Layout:** Searchable table with inline reply
- **Data:** `reviews[]`, search query
- **UI Components:**
  - Review table with actions
  - Inline reply form
  - Search/filter controls

### Current Issues:
- Table may feel dense
- Inline reply form could be cleaner

### Enhancement Focus:
- Streamline table design
- Simplify inline reply interface
- Improve search controls

---

## 9. Edit Profile (`/dashboard/edit-profile`)

### Parameters:
- **Layout:** Business info form + Image uploads + Hours editor
- **Form Fields:** Name, Description, Category, Location, Contact, Hours
- **UI Components:**
  - Text inputs and textareas
  - Image upload areas
  - Hours editor (day/time selectors)
  - Save buttons

### Current Issues:
- Multiple form sections may feel overwhelming
- Hours editor could be cleaner

### Enhancement Focus:
- Organize form into clear sections
- Simplify hours editing interface
- Streamline image upload process

---

## 10. Updates/Announcements (`/dashboard/updates`)

### Parameters:
- **Layout:** Form (left) + Updates list (right, sticky)
- **Form Fields:** Title, Content
- **Data:** `updates[]`
- **UI Components:**
  - Create update form
  - Updates list with edit/delete
  - Modal dialogs for edit/delete

### Current Issues:
- Two-column layout may feel unbalanced
- Modal dialogs could be cleaner

### Enhancement Focus:
- Balance the two-column layout
- Simplify modal interfaces
- Streamline updates list design

---

## 11. Analytics (`/dashboard/analytics`)

### Parameters:
- **Layout:** Stats cards + Chart
- **Data:** `analyticsData`
- **UI Components:**
  - Recharts visualization
  - Stats cards
  - Date range selector

### Current Issues:
- Chart may feel cluttered
- Stats display could be cleaner

### Enhancement Focus:
- Simplify chart design
- Streamline stats cards
- Improve date selector

---

## 12. Widget (`/dashboard/widget`)

### Parameters:
- **Layout:** Size options + Theme selector + Preview + Embed code
- **Data:** `businessId`
- **UI Components:**
  - Size toggles
  - Theme selector
  - Preview iframe
  - Copy-to-clipboard button

### Current Issues:
- Multiple controls may feel overwhelming
- Preview area could be cleaner

### Enhancement Focus:
- Organize controls more intuitively
- Simplify preview display
- Streamline embed code section

---

## 13. Admin Dashboard (`/admin`)

### Parameters:
- **Layout:** Stats + Quick links + Recent activity
- **Data:** `adminStats`
- **UI Components:**
  - Stat cards
  - Quick action buttons
  - Activity feed

### Current Issues:
- Multiple elements may create visual clutter
- Activity feed could be cleaner

### Enhancement Focus:
- Clean up stat card design
- Organize quick links better
- Streamline activity feed

---

## 14. Users Management (`/admin/utilisateurs`)

### Parameters:
- **Layout:** Searchable table with dropdown actions
- **Data:** `users[]`, search/filter states
- **UI Components:**
  - User table
  - Search/filter controls
  - Action dropdowns
  - Pagination

### Current Issues:
- Table with dropdowns may feel complex
- Multiple controls could be cleaner

### Enhancement Focus:
- Simplify table interface
- Streamline action dropdowns
- Clean up filter controls

---

## 15. Businesses Management (`/admin/etablissements`)

### Parameters:
- **Layout:** Searchable table with dropdown actions
- **Data:** `businesses[]`, search/filter states
- **UI Components:**
  - Business table
  - Search/filter controls
  - Action dropdowns
  - Pagination

### Current Issues:
- Similar to users management, may feel cluttered

### Enhancement Focus:
- Apply same UI improvements as users management
- Streamline table design
- Clean up action controls

---

## 16. Review Moderation (`/admin/avis-signalements`)

### Parameters:
- **Layout:** Queue table + Detail view + Actions
- **Data:** `reports[]`
- **UI Components:**
  - Reports table
  - Detail modal/popup
  - Approve/Reject/Delete buttons

### Current Issues:
- Multiple interfaces may feel complex
- Action buttons could be cleaner

### Enhancement Focus:
- Simplify moderation workflow
- Streamline action buttons
- Clean up detail view

---

## 17. Site Settings (`/admin/parametres`)

### Parameters:
- **Layout:** Tabbed interface with forms
- **Tabs:** General, Features, Registrations, Maintenance, Support, Social
- **Form Fields:** Various settings per tab
- **UI Components:**
  - Tab navigation
  - Settings forms
  - Toggle switches
  - Input fields

### Current Issues:
- **This is the most cluttered screen** - multiple tabs with various controls
- Too many settings visible at once
- Tab organization could be cleaner

### Enhancement Focus:
- **Priority:** Clean up this screen significantly
- Organize settings in more intuitive groups
- Simplify toggle and input designs
- Streamline tab navigation
- Reduce visual density

---

## Enhancement Priorities:

### 1. Highest Priority (Most Cluttered):
- **Site Settings (`/admin/parametres`)** - Major cleanup needed

### 2. High Priority:
- Business Listing filters
- Business Detail tabs
- Dashboard quick actions

### 3. Medium Priority:
- Homepage categories
- Reviews Management table
- Updates/Announcements layout

### 4. Low Priority:
- Other screens have good structure but could benefit from streamlined components

---

## UI/UX Principles to Apply:

1. **Minimize Visual Noise:** Reduce unnecessary elements
2. **Clear Hierarchy:** Use typography and spacing effectively
3. **Consistent Patterns:** Apply similar design patterns across screens
4. **Focus on Primary Actions:** Make main CTAs clear and prominent
5. **Simplify Forms:** Reduce cognitive load in form inputs
6. **Clean Tables:** Streamline data presentation
7. **Organized Navigation:** Make navigation intuitive and clean
