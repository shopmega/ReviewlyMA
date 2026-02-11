'use client';

import { createClient } from '@/lib/supabase/client';

export type ActivityEvent = {
    id: string;
    type: 'review' | 'user' | 'business' | 'report' | 'claim';
    title: string;
    description: string;
    user_name: string;
    timestamp: string;
    icon_type?: string;
};

export async function getRecentActivity(): Promise<ActivityEvent[]> {
    const supabase = createClient();

    // In a real app, we'd fetch from multiple tables and combine or use an audit_logs table
    // For now, let's fetch the 10 most recent reviews and 5 most recent users as activity

    const [reviewsResult, usersResult] = await Promise.all([
        supabase.from('reviews').select('id, title, author_name, rating, created_at, businesses(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false }).limit(5)
    ]);

    const activities: ActivityEvent[] = [];

    if (reviewsResult.data) {
        reviewsResult.data.forEach((r: any) => {
            activities.push({
                id: `review-${r.id}`,
                type: 'review',
                title: 'Nouvel avis publié',
                description: `${r.author_name} a noté ${r.businesses?.name || 'un établissement'} ${r.rating} étoiles`,
                user_name: r.author_name,
                timestamp: r.created_at,
                icon_type: 'star'
            });
        });
    }

    if (usersResult.data) {
        usersResult.data.forEach(u => {
            activities.push({
                id: `user-${u.id}`,
                type: 'user',
                title: 'Nouvel utilisateur',
                description: `${u.full_name || 'Un utilisateur'} a rejoint la plateforme`,
                user_name: u.full_name || 'Utilisateur',
                timestamp: u.created_at,
                icon_type: 'user'
            });
        });
    }

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
