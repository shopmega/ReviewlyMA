-- Review Votes table and triggers
-- Handles counting likes and dislikes on the reviews table

-- 1. Create review_votes table
CREATE TABLE IF NOT EXISTS public.review_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(review_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Review votes are viewable by everyone" ON public.review_votes;
CREATE POLICY "Review votes are viewable by everyone" ON public.review_votes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.review_votes;
CREATE POLICY "Authenticated users can vote" ON public.review_votes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vote" ON public.review_votes;
CREATE POLICY "Users can update their own vote" ON public.review_votes
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vote" ON public.review_votes;
CREATE POLICY "Users can delete their own vote" ON public.review_votes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Trigger function to update reviews table
CREATE OR REPLACE FUNCTION public.handle_review_vote_change()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT or UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Recompute likes and dislikes for this review
        UPDATE public.reviews
        SET 
            likes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = NEW.review_id AND vote_type = 'like'),
            dislikes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = NEW.review_id AND vote_type = 'dislike')
        WHERE id = NEW.review_id;
        RETURN NEW;
    -- For DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.reviews
        SET 
            likes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = OLD.review_id AND vote_type = 'like'),
            dislikes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = OLD.review_id AND vote_type = 'dislike')
        WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create triggers
DROP TRIGGER IF EXISTS on_review_vote_change ON public.review_votes;
CREATE TRIGGER on_review_vote_change
AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
FOR EACH ROW EXECUTE FUNCTION public.handle_review_vote_change();
