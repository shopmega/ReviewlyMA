'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ActionState } from '@/lib/types';

export type Notification = {
    id: number;
    user_id: string | null;
    title: string;
    message: string;
    type: string;
    link?: string;
    is_read: boolean;
    created_at: string;
};

export async function getNotifications(): Promise<Notification[]> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data as Notification[];
}

export async function markAsRead(notificationId: number): Promise<ActionState> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { status: 'error', message: 'Non authentifié.' };

    const { data: targetNotification, error: targetError } = await supabase
        .from('notifications')
        .select('id, user_id')
        .eq('id', notificationId)
        .maybeSingle();

    if (targetError || !targetNotification) {
        return { status: 'error', message: 'Notification introuvable.' };
    }

    // Global notifications are shared rows; keep them read-only to avoid mutating state for all users.
    if (targetNotification.user_id === null) {
        return { status: 'success', message: 'Notification consultee.' };
    }

    if (targetNotification.user_id !== user.id) {
        return { status: 'error', message: 'Acces non autorise.' };
    }

    const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select('id');

    if (error || !data || data.length === 0) {
        return { status: 'error', message: 'Impossible de marquer comme lu.' };
    }

    return { status: 'success', message: 'Notification lue.' };
}

export async function markAllAsRead(): Promise<ActionState> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { status: 'error', message: 'Non authentifié' };

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);

    if (error) {
        return { status: 'error', message: 'Erreur lors de la mise à jour.' };
    }

    return { status: 'success', message: 'Toutes les notifications sont lues.' };
}
