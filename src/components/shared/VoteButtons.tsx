'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

type VoteButtonsProps = {
  reviewId: number;
  initialLikes: number;
  initialDislikes: number;
};

export function VoteButtons({ reviewId, initialLikes, initialDislikes }: VoteButtonsProps) {
  const [votes, setVotes] = useState({
    likes: initialLikes,
    dislikes: initialDislikes,
    userVote: null as 'like' | 'dislike' | null,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        // Fetch user's existing vote safely
        const { data: voteData, error: voteError } = await supabase
          .from('review_votes')
          .select('vote_type')
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        if (voteData && voteData.length > 0) {
          setVotes(prev => ({
            ...prev,
            userVote: voteData[0].vote_type as 'like' | 'dislike'
          }));
        }
      }
    };

    fetchUserData();
  }, [reviewId]);

  const handleLike = async () => {
    if (!userId) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour voter sur un avis.",
        variant: "destructive",
      });
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      // If user already liked, remove the like
      if (votes.userVote === 'like') {
        const { error } = await supabase
          .from('review_votes')
          .delete()
          .match({ review_id: reviewId, user_id: userId });

        if (!error) {
          setVotes(prev => ({
            ...prev,
            likes: prev.likes - 1,
            userVote: null,
          }));
        }
      } else {
        // Optimistic UI: If user previously disliked, remove the dislike and add like
        const prevVote = votes.userVote;

        const { error } = await supabase
          .from('review_votes')
          .upsert({
            review_id: reviewId,
            user_id: userId,
            vote_type: 'like',
          }, { onConflict: 'review_id,user_id' });

        if (!error) {
          setVotes(prev => ({
            likes: prev.likes + 1,
            dislikes: prevVote === 'dislike' ? prev.dislikes - 1 : prev.dislikes,
            userVote: 'like',
          }));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!userId) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour voter sur un avis.",
        variant: "destructive",
      });
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      // If user already disliked, remove the dislike
      if (votes.userVote === 'dislike') {
        const { error } = await supabase
          .from('review_votes')
          .delete()
          .match({ review_id: reviewId, user_id: userId });

        if (!error) {
          setVotes(prev => ({
            ...prev,
            dislikes: prev.dislikes - 1,
            userVote: null,
          }));
        }
      } else {
        // Optimistic UI: If user previously liked, remove the like and add dislike
        const prevVote = votes.userVote;

        const { error } = await supabase
          .from('review_votes')
          .upsert({
            review_id: reviewId,
            user_id: userId,
            vote_type: 'dislike',
          }, { onConflict: 'review_id,user_id' });

        if (!error) {
          setVotes(prev => ({
            likes: prevVote === 'like' ? prev.likes - 1 : prev.likes,
            dislikes: prev.dislikes + 1,
            userVote: 'dislike',
          }));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={votes.userVote === 'like' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={handleLike}
        disabled={isLoading}
        className={`flex items-center gap-1 text-xs h-8 px-2.5 ${votes.userVote === 'like' ? 'text-primary bg-primary/10 hover:bg-primary/20' : ''}`}
      >
        <ThumbsUp className={`w-3.5 h-3.5 ${votes.userVote === 'like' ? 'fill-current' : ''}`} />
        <span className="font-medium">{votes.likes}</span>
      </Button>
      <Button
        variant={votes.userVote === 'dislike' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={handleDislike}
        disabled={isLoading}
        className={`flex items-center gap-1 text-xs h-8 px-2.5 ${votes.userVote === 'dislike' ? 'text-destructive bg-destructive/10 hover:bg-destructive/20' : ''}`}
      >
        <ThumbsDown className={`w-3.5 h-3.5 ${votes.userVote === 'dislike' ? 'fill-current' : ''}`} />
        <span className="font-medium">{votes.dislikes}</span>
      </Button>
    </div>
  );
}