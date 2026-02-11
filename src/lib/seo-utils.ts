/**
 * SEO Utilities for dynamic route parsing
 */

/**
 * Parses a slug like "restaurants-in-casablanca" into { category, city }
 */
export function parseSeoSlug(slug: string): { category: string; city: string } | null {
    if (!slug || typeof slug !== 'string' || !slug.includes('-in-')) return null;

    const parts = slug.split('-in-');
    if (parts.length < 2) return null;

    // Most common case: category-in-city
    // If there are multiple "-in-", we take the last one as the city separator
    const city = parts[parts.length - 1];
    const category = parts.slice(0, parts.length - 1).join('-in-');

    if (!city || !category) return null;

    return {
        category: category.toLowerCase(),
        city: city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    };
}

/**
 * Generates an SEO-friendly title for a category and city
 */
export function generateSeoTitle(category: string, city: string): string {
    const catName = category.charAt(0).toUpperCase() + category.slice(1);
    return `Les Meilleurs ${catName} à ${city} - Avis & Classement 2026`;
}

/**
 * Generates an SEO-friendly description
 */
export function generateSeoDescription(category: string, city: string, count: number): string {
    return `Découvrez notre sélection des ${count} meilleurs ${category} à ${city}. Consultez les avis authentiques, comparez les prix et trouvez l'établissement idéal pour vous au Maroc.`;
}
