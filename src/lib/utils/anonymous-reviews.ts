/**
 * Utility functions for handling anonymous reviews
 */

/**
 * Determines if a review should display the author's real name
 * @param review - The review object
 * @param currentUserRole - Current user's role ('user', 'pro', 'admin')
 * @param currentUserId - Current user's ID
 * @param businessOwnerId - Business owner's ID (for pro users viewing their own business)
 * @returns boolean - true if name should be shown, false if should be anonymized
 */
export function shouldShowAuthorName(
  review: { 
    author_name: string; 
    is_anonymous?: boolean; 
    user_id?: string 
  },
  currentUserRole: string | null,
  currentUserId: string | null,
  businessOwnerId: string | null = null
): boolean {
  // Always show names to admins
  if (currentUserRole === 'admin') {
    return true;
  }
  
  // Show names to the review author themselves
  if (currentUserId && review.user_id === currentUserId) {
    return true;
  }
  
  // Business owners should NOT see reviewer names (privacy protection)
  // This maintains true anonymity for employee reviews
  
  // Otherwise, respect the anonymous flag
  return !review.is_anonymous;
}

/**
 * Gets the display name for a review author
 * @param review - The review object
 * @param currentUserRole - Current user's role
 * @param currentUserId - Current user's ID
 * @param businessOwnerId - Business owner's ID
 * @returns string - The name to display
 */
export function getAuthorDisplayName(
  review: { 
    author_name: string; 
    is_anonymous?: boolean; 
    user_id?: string 
  },
  currentUserRole: string | null,
  currentUserId: string | null,
  businessOwnerId: string | null = null
): string {
  if (shouldShowAuthorName(review, currentUserRole, currentUserId, businessOwnerId)) {
    return review.author_name;
  }
  
  return 'Utilisateur Anonyme';
}

/**
 * Gets the display initials for a review author (for avatar purposes)
 * @param review - The review object
 * @param currentUserRole - Current user's role
 * @param currentUserId - Current user's ID
 * @param businessOwnerId - Business owner's ID
 * @returns string - The initials to display
 */
export function getAuthorInitials(
  review: { 
    author_name: string; 
    is_anonymous?: boolean; 
    user_id?: string 
  },
  currentUserRole: string | null,
  currentUserId: string | null,
  businessOwnerId: string | null = null
): string {
  if (shouldShowAuthorName(review, currentUserRole, currentUserId, businessOwnerId)) {
    return review.author_name.charAt(0).toUpperCase();
  }
  
  return '?';
}