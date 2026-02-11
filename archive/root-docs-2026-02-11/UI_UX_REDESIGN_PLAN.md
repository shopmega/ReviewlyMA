# 🎨 UI/UX Redesign Plan: "Avis Premium"
**Date:** January 2026
**Objective:** Elevate Avis.ma from a functional directory to a premium, immersive discovery platform for Morocco.

## 1. Design Vision: "Modern Moroccan Elegance"
We will shift the aesthetic from "Clean SaaS" to "Premium Lifestyle". The design should feel expensive, trustworthy, and vibrant, reflecting the richness of Moroccan culture without being cliché.

### Core Pillars
1.  **Immersive Imagery**: Photos should be large, high-quality, and central to the experience. Use gradients to ensure text readability.
2.  **Glassmorphism & Depth**: extensive use of `backdrop-blur`, subtle borders (`border-white/10`), and deep shadows to create hierarchy.
3.  **Micro-Interactions**: Everything should feel alive. Hover states, entrance animations, and smooth transitions are mandatory.
4.  **Typography as UI**: Large, bold headings (Poppins) to guide the eye.

## 2. Design System Updates

### Color Palette (Refinement)
*   **Primary**: `Teal #2C8A8A` (Keep, but use more sparingly as an action color).
*   **Secondary/Gold**: `#D4AF37` or `#E6B800` (Add for ranking icons, "Premium" badges).
*   **Backgrounds**:
    *   Light: `Warm Sand #FAFAF9` (instead of pure white/gray).
    *   Dark: `Deep Blue-Grey #0F172A` (Rich dark mode).
*   **Gradients**: Introduce subtle gradients (e.g., Teal-to-Blue) for buttons and active states.

### Typography
*   **Headlines**: **Poppins** (Weights: 600, 700). Increase line-heights for elegance.
*   **Body**: **Inter** or **DM Sans** (More modern than PT Sans). *Action item: Switch from PT Sans to Inter.*

### Shapes & Spacing
*   **Radius**: Increase global radius to `rounded-2xl` or `rounded-3xl` for a friendlier, modern feel.
*   **Spacing**: Increase whitespace (padding) inside cards and between sections (80px+ usually).

## 3. Component Overhaul Strategy

### A. The "Hero" Experience (Home Page)
*   **Current**: Static image with overlay.
*   **New Design**:
    *   **Full-screen height** (`h-screen` or `min-h-[80vh]`).
    *   **Dynamic Background**: Slow-zoom slideshow or high-res video loop.
    *   **Glass Search Bar**: A floating, frosted-glass search bar appearing "suspended" in the center.
    *   **Floating Pills**: "Popular" tags should look like frosted glass pills.

### B. Visual Categories (The "Bento" Grid)
*   **Current**: Small icon squares.
*   **New Design**:
    *   Use a **Masonry or Bento Grid** layout.
    *   Each category is a card with a real photo background + gradient overlay + bold text.
    *   Example: A card showing a delicious Tagine for "Restaurants".

### C. Business Cards
*   **Current**: Image top, text bottom, solid info.
*   **New Design**:
    *   **Aspect Ratio**: Taller cards.
    *   **Hover**: Card lifts up (`-translate-y-2`) and shadow deepens.
    *   **Rating**: Gold star icon, prominent score.
    *   **Badges**: "Top Rated" in a floating metallic badge.

### D. Navigation (Header)
*   **Current**: White sticky bar.
*   **New Design**:
    *   **Transparent on Top**: Merges with hero image.
    *   **Frosted on Scroll**: Becomes `bg-white/80 backdrop-blur-md` when scrolling down.
    *   **Call to Action**: "Write a Review" button should be a gradient button.

## 4. Implementation Phase Plan

### Phase 1: Foundation 🛠
1.  Update `tailwind.config.ts` with new colors, fonts (Inter), and animations.
2.  Update `globals.css` with new base styles (softer backgrounds).
3.  Install necessary libraries (`framer-motion` for animations if approved, or use pure CSS `animate-in` utilities).

### Phase 2: The Core Experience (Home) 🏠
1.  **Redesign Header**: Implement the transparent-to-glass scroll effect.
2.  **Redesign Hero**: Build the immersive hero component.
3.  **Redesign Categories**: Build the "Bento Grid" meant to replace the icon row.
4.  **Redesign Footer**: Clean, multi-column, dark-themed footer.

### Phase 3: Discovery Components 🔍
1.  **Business Card 2.0**: Rebuild `BusinessCard.tsx`.
2.  **Collection Carousel**: Update the seasonal carousel with "Parallax" effects if possible.

### Phase 4: Details & Polish ✨
1.  **Business Details Page**: Revamp the layout to look like an Airbnb listing (huge photos, sticky sidebar).
2.  **User Dashboard**: Dark mode optimization and clearer data viz.

## 5. Immediate Next Steps
*   **Approve Plan**: User to confirm they want to proceed with this aesthetic.
*   **Setup**: I will install `lucide-react` (already there) and potentially `clsx` / `tailwind-merge` (already there).
