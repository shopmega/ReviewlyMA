import { notFound } from 'next/navigation';
import { getCurrentUserWithProfile } from '@/lib/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { EditReviewModal } from '@/components/reviews/EditReviewModal';
import type { Review } from '@/lib/types';

interface EditReviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getReview(reviewId: number): Promise<Review & { business_id: string } | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Review & { business_id: string };
}

async function canEditReview(reviewId: number, userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  // Check if user owns this review (or is admin)
  const { data: review } = await supabase
    .from('reviews')
    .select('user_id, author_name')
    .eq('id', reviewId)
    .single();

  if (!review) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isOwner = review.user_id === userId;

  return isAdmin || isOwner;
}

export default async function EditReviewPage({ params }: EditReviewPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUserWithProfile();
  
  if (!currentUser?.user) {
    notFound();
  }

  const reviewId = parseInt(id);
  if (isNaN(reviewId)) {
    notFound();
  }

  const review = await getReview(reviewId);
  
  if (!review) {
    notFound();
  }

  const canEdit = await canEditReview(reviewId, currentUser.user.id);
  
  if (!canEdit) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-headline">Modifier votre avis</h1>
          <p className="text-muted-foreground">
            Mettez à jour votre évaluation pour "{review.title}"
          </p>
        </div>
        
        <EditReviewModal 
          review={review}
          isOpen={true}
          onClose={() => {
            // Redirect back to business page
            window.location.href = `/businesses/${review.business_id}`;
          }}
          onUpdate={(updatedReview) => {
            // Redirect back to business page after update
            window.location.href = `/businesses/${review.business_id}`;
          }}
        />
      </div>
    </div>
  );
}
