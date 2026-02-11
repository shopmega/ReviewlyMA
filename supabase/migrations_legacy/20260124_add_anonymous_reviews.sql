-- Migration: Add anonymous reviews support
-- Description: Adds is_anonymous column to reviews table

ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.reviews.is_anonymous IS 'Indicates if the review was posted anonymously';
