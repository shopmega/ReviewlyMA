export type ReviewSortOption = 'newest' | 'oldest' | 'rating' | 'helpful';

type ReviewSortable = {
  date: string;
  rating: number;
  likes?: number | null;
  dislikes?: number | null;
};

type ReviewAppealLike = {
  review_id: number;
  status: 'open' | 'in_review' | 'accepted' | 'rejected';
};

export function getReviewHelpfulScore(review: Pick<ReviewSortable, 'likes' | 'dislikes'>) {
  return (review.likes || 0) - (review.dislikes || 0);
}

export function sortReviews<T extends ReviewSortable>(reviews: T[], sortOption: ReviewSortOption) {
  const sorted = [...reviews];

  switch (sortOption) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'helpful':
      return sorted.sort((a, b) => getReviewHelpfulScore(b) - getReviewHelpfulScore(a));
    default:
      return sorted;
  }
}

export function mapLatestAppealsByReview<T extends ReviewAppealLike>(appeals: T[]) {
  const byReview: Record<number, T> = {};

  for (const appeal of appeals) {
    if (!byReview[appeal.review_id]) {
      byReview[appeal.review_id] = appeal;
    }
  }

  return byReview;
}

export function isReviewAppealActive(status?: ReviewAppealLike['status'] | null) {
  return status === 'open' || status === 'in_review';
}

export function isModeratedReviewStatus(status?: string | null) {
  return status === 'rejected' || status === 'hidden' || status === 'deleted';
}
