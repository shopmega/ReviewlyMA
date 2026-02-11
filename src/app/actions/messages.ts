'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ActionState } from '@/lib/types';

export type Message = {
    id: string;
    business_id: string;
    sender_id: string | null;
    sender_name: string | null;
    sender_email: string | null;
    content: string;
    is_from_business: boolean;
    read_at: string | null;
    created_at: string;
};

export async function getMessages(businessId: string): Promise<ActionState<Message[]>> {
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
        return { status: 'error', message: 'Non authentifié.' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'admin' && profile.business_id !== businessId)) {
        return { status: 'error', message: 'Accès non autorisé.' };
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch messages error:', error);
            return { status: 'error', message: 'Erreur lors du chargement des messages.' };
        }

        return { status: 'success', message: '', data: data || [] };
    } catch (error: any) {
        return { status: 'error', message: 'Une erreur est survenue.' };
    }
}

export async function sendMessage(payload: {
    business_id: string;
    content: string;
    is_from_business?: boolean;
    sender_name?: string;
    sender_email?: string;
}): Promise<ActionState> {
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

    // If it's from business, we MUST be authenticated and match business_id
    const { data: { user } } = await supabase.auth.getUser();

    if (payload.is_from_business) {
        if (!user) return { status: 'error', message: 'Non authentifié.' };

        // Verify ownership (simplified, RLS will also catch this)
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id, role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.business_id !== payload.business_id)) {
            return { status: 'error', message: 'Accès non autorisé.' };
        }
    }

    try {
        const { error } = await supabase
            .from('messages')
            .insert([{
                business_id: payload.business_id,
                content: payload.content,
                sender_id: user?.id || null,
                sender_name: payload.sender_name || null,
                sender_email: payload.sender_email || null,
                is_from_business: payload.is_from_business || false
            }]);

        if (error) {
            console.error('Send message error:', error);
            return { status: 'error', message: 'Erreur lors de l\'envoi du message.' };
        }

        return { status: 'success', message: 'Message envoyé avec succès !' };
    } catch (error: any) {
        console.error('Send message unexpected error:', error);
        return { status: 'error', message: 'Une erreur est survenue.' };
    }
}
