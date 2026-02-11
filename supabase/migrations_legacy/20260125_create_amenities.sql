-- Create amenities table
CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(name, group_name)
);

-- RLS Policies
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to amenities"
    ON public.amenities FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write access to amenities"
    ON public.amenities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Seed defaults from location-discovery.ts
INSERT INTO public.amenities (name, group_name, icon) VALUES
    -- Flexibilité
    ('Télétravail', 'Flexibilité', '🏠'),
    ('Horaires flexibles', 'Flexibilité', '🏠'),
    ('Crédit temps', 'Flexibilité', '🏠'),
    
    -- Santé & Bien-être
    ('Mutuelle santé', 'Santé & Bien-être', '🏥'),
    ('Salle de sport', 'Santé & Bien-être', '🏥'),
    ('Salle de repos', 'Santé & Bien-être', '🏥'),
    ('Pause café', 'Santé & Bien-être', '🏥'),
    
    -- Avantages financiers
    ('Tickets restaurant', 'Avantages financiers', '💰'),
    ('Prime performance', 'Avantages financiers', '💰'),
    ('Congés supplémentaires', 'Avantages financiers', '💰'),
    ('Bonus annuel', 'Avantages financiers', '💰'),
    
    -- Développement
    ('Formation continue', 'Développement', '📚'),
    ('Évolution de carrière', 'Développement', '📚'),
    ('Coaching', 'Développement', '📚'),
    ('Mentorat', 'Développement', '📚'),
    
    -- Infrastructures
    ('Parking gratuit', 'Infrastructures', '🏢'),
    ('Transport en commun', 'Infrastructures', '🏢'),
    ('Crèche entreprise', 'Infrastructures', '🏢'),
    ('Ascenseur', 'Infrastructures', '🏢'),
    ('Accès PMR', 'Infrastructures', '🏢'),
    ('Cantine', 'Infrastructures', '🏢'),
    
    -- Culture & Équipe
    ('Team building', 'Culture & Équipe', '🤝'),
    ('Événements internes', 'Culture & Équipe', '🤝'),
    ('Open space', 'Culture & Équipe', '🤝'),
    ('Bureau privé', 'Culture & Équipe', '🤝')
ON CONFLICT (name, group_name) DO NOTHING;
