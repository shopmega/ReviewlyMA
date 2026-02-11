# AVIS.ma - Component Parameters for UI/UX Enhancement

**Objective:** Clean, organized layouts with minimal clutter for improved UI/UX

---

## Core UI Components

### 1. BusinessCard Component
**Location:** `src/components/shared/BusinessCard.tsx`

**Props:**
- `business`: Business object with name, rating, location, category, logo
- `className`: Additional CSS classes
- `showCategory`: Boolean to show/hide category
- `showRating`: Boolean to show/hide rating

**Current Issues:**
- May display too much information at once
- Rating display could be cleaner

**Enhancement Focus:**
- Simplify information hierarchy
- Streamline rating visualization
- Reduce visual density

---

### 2. StarRating Component
**Location:** `src/components/shared/StarRating.tsx`

**Props:**
- `rating`: Number (0-5)
- `size`: 'sm', 'md', or 'lg'
- `showValue`: Boolean to show numeric value

**Current Issues:**
- Could be more visually appealing
- Size variants may not be consistent

**Enhancement Focus:**
- Improve visual design
- Ensure consistent sizing
- Add hover states if interactive

---

### 3. SubRatingBar Component
**Location:** `src/components/shared/SubRatingBar.tsx`

**Props:**
- `label`: String (e.g., "Service", "Quality")
- `value`: Number (0-5)
- `maxValue`: Number (default: 5)

**Current Issues:**
- May clutter review displays
- Visual representation could be cleaner

**Enhancement Focus:**
- Simplify visual representation
- Reduce space consumption
- Improve readability

---

### 4. BusinessHoursEditor Component
**Location:** `src/components/shared/BusinessHoursEditor.tsx`

**Props:**
- `initialHours`: DayHours[] array
- `onHoursChange`: Callback function
- `disabled`: Boolean

**Current Issues:**
- Interface may feel complex
- Multiple day/time selectors

**Enhancement Focus:**
- Simplify day/time selection
- Group related controls
- Reduce visual complexity

---

### 5. PhotoGallery Component
**Location:** `src/components/shared/PhotoGallery.tsx`

**Props:**
- `photos`: ImagePlaceholder[] array
- `className`: Additional CSS classes
- `showThumbnails`: Boolean

**Current Issues:**
- Gallery controls may be cluttered
- Thumbnail display could be cleaner

**Enhancement Focus:**
- Streamline gallery navigation
- Simplify thumbnail interface
- Improve mobile experience

---

## Form Components

### 6. ReviewForm Component
**Location:** `src/components/forms/ReviewForm.tsx`

**Props:**
- `businessId`: String
- `onSubmit`: Callback function
- `className`: Additional CSS classes

**Current Issues:**
- Rating selection may feel complex
- Multiple subrating inputs

**Enhancement Focus:**
- Simplify rating interface
- Streamline subrating inputs
- Improve form validation display

---

## Layout Components

### 7. Header Component
**Location:** `src/components/layout/Header.tsx`

**Props:**
- `className`: Additional CSS classes
- `showSearch`: Boolean
- `showAuthLinks`: Boolean

**Current Issues:**
- Navigation may feel cluttered
- Multiple elements in header

**Enhancement Focus:**
- Organize navigation elements
- Streamline auth links display
- Improve mobile menu

---

### 8. Footer Component
**Location:** `src/components/layout/Footer.tsx`

**Props:**
- `className`: Additional CSS classes

**Current Issues:**
- May contain too many links
- Information density

**Enhancement Focus:**
- Organize links into groups
- Simplify information display
- Improve mobile layout

---

## Dashboard Components

### 9. AnalyticsChart Component
**Location:** `src/components/shared/AnalyticsChart.tsx`

**Props:**
- `data`: Chart data array
- `type`: Chart type ('line', 'bar', etc.)
- `className`: Additional CSS classes

**Current Issues:**
- Chart may feel cluttered
- Legend and labels could be cleaner

**Enhancement Focus:**
- Simplify chart design
- Streamline legend display
- Improve label readability

---

### 10. RatingDistribution Component
**Location:** `src/components/shared/RatingDistribution.tsx`

**Props:**
- `distribution`: Rating distribution object
- `totalRatings`: Number
- `className`: Additional CSS classes

**Current Issues:**
- May display too much information
- Visual complexity

**Enhancement Focus:**
- Simplify distribution visualization
- Reduce visual noise
- Improve readability

---

## Admin Components

### 11. BusinessActions Component
**Location:** `src/components/shared/BusinessActions.tsx`

**Props:**
- `business`: Business object
- `onEdit`: Callback function
- `onDelete`: Callback function
- `onFeature`: Callback function

**Current Issues:**
- Action buttons may feel cluttered
- Multiple actions in small space

**Enhancement Focus:**
- Organize actions more clearly
- Simplify button design
- Improve dropdown implementation

---

## UI Library Components (ShadCN)

### 12. Card Components
**Location:** `src/components/ui/card.tsx`

**Props:**
- `className`: Additional CSS classes
- Used in: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

**Current Issues:**
- Default styling may be too prominent
- Padding/margin may be excessive

**Enhancement Focus:**
- Streamline card design
- Reduce default spacing where appropriate
- Improve visual consistency

---

### 13. Button Component
**Location:** `src/components/ui/button.tsx`

**Props:**
- `variant`: 'default', 'destructive', 'outline', etc.
- `size`: 'default', 'sm', 'lg', 'icon'
- `className`: Additional CSS classes

**Current Issues:**
- May be too visually prominent
- Size variants may not be consistent

**Enhancement Focus:**
- Simplify button design
- Ensure consistent sizing
- Reduce visual weight where appropriate

---

### 14. Input Component
**Location:** `src/components/ui/input.tsx`

**Props:**
- `type`: Input type
- `placeholder`: Placeholder text
- `className`: Additional CSS classes

**Current Issues:**
- Default styling may be too prominent
- Focus states could be cleaner

**Enhancement Focus:**
- Streamline input design
- Simplify focus states
- Improve consistency

---

### 15. Table Components
**Location:** `src/components/ui/table.tsx`

**Props:**
- Used in: Table, TableHeader, TableBody, TableRow, TableCell, TableHead

**Current Issues:**
- Table borders may be too prominent
- Cell padding may be excessive

**Enhancement Focus:**
- Simplify table design
- Reduce visual noise
- Improve readability

---

## Theme Components

### 16. ThemeToggle Component
**Location:** `src/components/shared/ThemeToggle.tsx`

**Props:**
- `className`: Additional CSS classes

**Current Issues:**
- May not be visually consistent
- Placement could be improved

**Enhancement Focus:**
- Simplify toggle design
- Improve visual integration
- Ensure consistent placement

---

### 17. ThemeProvider Component
**Location:** `src/components/providers/theme-provider.tsx`

**Props:**
- `children`: React children

**Current Issues:**
- None (implementation detail)

**Enhancement Focus:**
- Ensure consistent theme application
- Support clean light/dark modes

---

## Key Enhancement Areas by Component Category:

### Forms (Priority: High)
- ReviewForm: Simplify rating interface
- BusinessHoursEditor: Reduce complexity
- Input components: Streamline design

### Data Display (Priority: High)
- BusinessCard: Reduce information density
- StarRating: Improve visual design
- RatingDistribution: Simplify visualization

### Navigation (Priority: Medium)
- Header: Organize elements
- Card components: Reduce visual weight
- Button components: Simplify design

### Tables (Priority: Medium)
- Table components: Reduce visual noise
- BusinessActions: Organize actions

### Dashboards (Priority: Medium)
- AnalyticsChart: Simplify design
- Dashboard layouts: Improve organization

### Admin (Priority: High)
- Admin-specific components: Streamline for efficiency

---

## Implementation Guidelines:

### 1. Visual Hierarchy
- Use typography to create clear information hierarchy
- Reduce visual weight of secondary elements
- Emphasize primary actions

### 2. Spacing & Layout
- Apply consistent spacing (use Tailwind spacing scale)
- Reduce padding/margin where appropriate
- Improve alignment and consistency

### 3. Color & Contrast
- Maintain sufficient contrast for accessibility
- Reduce visual noise with subtle colors
- Use color purposefully for emphasis

### 4. Interaction Design
- Simplify hover and focus states
- Make interactive elements clear but not overwhelming
- Provide clear feedback for actions

### 5. Responsive Design
- Maintain clean layouts on all screen sizes
- Simplify interfaces on smaller screens
- Ensure touch targets are appropriately sized
