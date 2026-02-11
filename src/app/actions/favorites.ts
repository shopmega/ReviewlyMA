'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleFavorite(businessId: string, path: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { status: 'error', message: 'Vous devez être connecté.' };
    }

    // Check if exists
    const { data: existing } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();

    if (existing) {
        // Remove
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('business_id', businessId);

        if (error) {
            console.error('Error removing favorite:', error);
            return { status: 'error', message: 'Erreur lors de la suppression' };
        }

        revalidatePath(path);
        return { status: 'removed', message: 'Retiré des favoris' };
    } else {
        // Add
        const { error } = await supabase
            .from('favorites')
            .insert({
                user_id: user.id,
                business_id: businessId
            });

        if (error) {
            console.error('Error adding favorite:', error);
            return { status: 'error', message: 'Erreur lors de l\'ajout' };
        }

        revalidatePath(path);
        return { status: 'added', message: 'Ajouté aux favoris' };
    }
}


export async function getFavoriteStatus(businessId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
        .from('favorites')
        .select('business_id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();

    return !!data;
}
