'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ActionState, SupportTicket, SupportMessage } from '@/lib/types';
import {
    createErrorResponse,
    createSuccessResponse,
    handleDatabaseError,
    logError,
    ErrorCode
} from '@/lib/errors';
import { sendEmail, emailTemplates } from '@/lib/email-service';
import { getSiteSettings } from '@/lib/data';
import { getServerSiteUrl, getSiteName } from '@/lib/site-config';



export type SupportTicketStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high';
export type SupportTicketCategory = 'account' | 'billing' | 'business' | 'reviews' | 'technical' | 'other';

/**
 * Create a new support ticket (user action)
 */
export async function createSupportTicket(
    subject: string,
    message: string,
    category: SupportTicketCategory,
    businessId?: string
): Promise<ActionState> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return createErrorResponse(
                ErrorCode.AUTHENTICATION_ERROR,
                'Vous devez être connecté pour créer un ticket'
            );
        }

        if (!subject || !message || !category) {
            return {
                status: 'error',
                message: 'Veuillez remplir tous les champs requis'
            };
        }

        // Handle 'none' value from the frontend select
        const finalBusinessId = businessId === 'none' ? null : businessId;

        const { error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: user.id,
                business_id: finalBusinessId,
                subject,
                message,
                category,
                status: 'pending',
                priority: 'medium',
                is_read_by_user: true,
                is_read_by_admin: false
            });

        if (error) {
            logError('create_support_ticket', error, { userId: user.id });
            return handleDatabaseError(error);
        }

        revalidatePath('/dashboard/support');

        return createSuccessResponse(
            'Votre ticket a été créé avec succès. Notre équipe vous répondra dans les plus brefs délais.'
        );
    } catch (error) {
        logError('create_support_ticket_unexpected', error);
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue lors de la création du ticket'
        );
    }
}

/**
 * Get all support tickets for the current user
 */
export async function getUserSupportTickets(): Promise<SupportTicket[]> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return [];
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                businesses (
                    name
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[getUserSupportTickets] Join failed, attempting simple select:', error);
            // Fallback to simple select
            const { data: simpleData, error: simpleError } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (simpleError) {
                console.error('[getUserSupportTickets] Simple select also failed:', simpleError);
                logError('get_user_support_tickets', simpleError, { userId: user.id });
                return [];
            }
            return (simpleData || []) as SupportTicket[];
        }

        return (data || []).map((ticket: any) => ({
            ...ticket,
            business_name: ticket.businesses?.name
        })) as SupportTicket[];
    } catch (error) {
        logError('get_user_support_tickets_unexpected', error);
        return [];
    }
}

/**
 * Get all support tickets (admin action)
 */
export async function getAllSupportTickets(): Promise<SupportTicket[]> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return [];
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            logError('get_all_support_tickets_unauthorized', new Error('Not admin'), { userId: user.id });
            return [];
        }

        // Use service client to bypass RLS for admin
        const serviceClient = await createServiceClient();

        const { data, error } = await serviceClient
            .from('support_tickets')
            .select(`
                *,
                user_profile:profiles (
                    full_name,
                    email
                ),
                businesses (
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[getAllSupportTickets] Join failed, attempting simple select:', error);
            // Fallback to simple select if join fails
            const { data: simpleData, error: simpleError } = await serviceClient
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (simpleError) {
                console.error('[getAllSupportTickets] Simple select also failed:', simpleError);
                return [];
            }
            return simpleData as SupportTicket[];
        }

        // Transform data to include user info
        return (data || []).map((ticket: any) => ({
            ...ticket,
            user_name: ticket.user_profile?.full_name || 'Utilisateur',
            user_email: ticket.user_profile?.email || 'Pas d\'email',
            business_name: ticket.businesses?.name
        })) as SupportTicket[];
    } catch (error) {
        logError('get_all_support_tickets_unexpected', error);
        return [];
    }
}

/**
 * Update support ticket status and add admin response (admin action)
 */
export async function updateSupportTicket(
    ticketId: string,
    status: SupportTicketStatus,
    adminResponse?: string,
    priority?: SupportTicketPriority
): Promise<ActionState> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return createErrorResponse(
                ErrorCode.AUTHENTICATION_ERROR,
                'Non autorisé'
            );
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return createErrorResponse(
                ErrorCode.AUTHORIZATION_ERROR,
                'Permissions insuffisantes'
            );
        }

        const updateData: any = {
            status,
            admin_user_id: user.id,
            is_read_by_admin: true,
            is_read_by_user: false
        };

        if (adminResponse) {
            updateData.admin_response = adminResponse;
        }

        if (priority) {
            updateData.priority = priority;
        }

        const { error } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId);

        if (error) {
            logError('update_support_ticket', error, { ticketId, userId: user.id });
            return handleDatabaseError(error);
        }

        revalidatePath('/admin/support');

        // Send email notification to user about the response
        if (adminResponse) {
            try {
                const serviceClient = await createServiceClient();
                const { data: ticket } = await serviceClient
                    .from('support_tickets')
                    .select('subject, user_id, profiles(full_name, email)')
                    .eq('id', ticketId)
                    .single();

                if (ticket && ticket.profiles && (ticket.profiles as any).email) {
                    const settings = await getSiteSettings();
                    const siteName = getSiteName(settings);
                    const siteUrl = getServerSiteUrl();

                    await sendEmail({
                        to: (ticket.profiles as any).email,
                        subject: emailTemplates.supportResponse.subject(ticket.subject),
                        html: emailTemplates.supportResponse.html({
                            userName: (ticket.profiles as any).full_name || 'Utilisateur',
                            ticketSubject: ticket.subject,
                            adminMessage: adminResponse,
                            siteName,
                            siteUrl
                        }),
                    });
                }
            } catch (emailError) {
                console.error('Error sending support response email:', emailError);
            }
        }

        return createSuccessResponse(
            'Le ticket a été mis à jour avec succès'
        );
    } catch (error) {
        logError('update_support_ticket_unexpected', error);
        return createErrorResponse(
            ErrorCode.SERVER_ERROR,
            'Une erreur est survenue lors de la mise à jour du ticket'
        );
    }
}

/**
 * Get support ticket statistics (admin action)
 */
export async function getSupportTicketStats(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
    closed: number;
    unread_admin: number;
}> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { total: 0, pending: 0, in_progress: 0, resolved: 0, closed: 0, unread_admin: 0 };
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return { total: 0, pending: 0, in_progress: 0, resolved: 0, closed: 0, unread_admin: 0 };
        }

        const serviceClient = await createServiceClient();

        const [totalResult, pendingResult, inProgressResult, resolvedResult, closedResult, unreadResult] = await Promise.all([
            serviceClient.from('support_tickets').select('*', { count: 'exact', head: true }),
            serviceClient.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            serviceClient.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
            serviceClient.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
            serviceClient.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
            serviceClient.from('support_tickets').select('*', { count: 'exact', head: true }).eq('is_read_by_admin', false),
        ]);

        return {
            total: totalResult.count || 0,
            pending: pendingResult.count || 0,
            in_progress: inProgressResult.count || 0,
            resolved: resolvedResult.count || 0,
            closed: closedResult.count || 0,
            unread_admin: unreadResult.count || 0,
        };
    } catch (error) {
        logError('get_support_ticket_stats_unexpected', error);
        return { total: 0, pending: 0, in_progress: 0, resolved: 0, closed: 0, unread_admin: 0 };
    }
}

/**
 * Mark a support ticket as read
 */
export async function markSupportTicketAsRead(
    ticketId: string,
    role: 'user' | 'admin'
): Promise<ActionState> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, 'Non authentifié');
        }

        const updateData: any = {};
        if (role === 'user') {
            updateData.is_read_by_user = true;
        } else {
            // Verify admin for admin read toggle
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role !== 'admin') {
                return createErrorResponse(ErrorCode.AUTHORIZATION_ERROR, 'Non autorisé');
            }
            updateData.is_read_by_admin = true;
        }

        const { error } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId);

        if (error) {
            logError('mark_support_ticket_read', error, { ticketId, role });
            return handleDatabaseError(error);
        }

        return createSuccessResponse('Marqué comme lu');
    } catch (error) {
        logError('mark_support_ticket_read_unexpected', error);
        return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur');
    }
}
/**
 * Send a message in a support ticket thread
 */
export async function sendSupportMessage(
    ticketId: string,
    message: string
): Promise<ActionState> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, 'Non authentifié');
        }

        // Get user profile to check role
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isAdmin = profile?.role === 'admin';

        const { error } = await supabase
            .from('support_ticket_messages')
            .insert({
                ticket_id: ticketId,
                sender_id: user.id,
                message
            });

        if (error) return handleDatabaseError(error);

        // Update ticket's unread status and updated_at
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (isAdmin) {
            updateData.is_read_by_user = false;
            updateData.is_read_by_admin = true;
        } else {
            updateData.is_read_by_admin = false;
            updateData.is_read_by_user = true;
        }

        await supabase.from('support_tickets').update(updateData).eq('id', ticketId);

        // Send email notification if admin is sending a message
        if (isAdmin) {
            try {
                const serviceClient = await createServiceClient();
                const { data: ticket } = await serviceClient
                    .from('support_tickets')
                    .select('subject, user_id, profiles(full_name, email)')
                    .eq('id', ticketId)
                    .single();

                if (ticket && ticket.profiles && (ticket.profiles as any).email) {
                    const settings = await getSiteSettings();
                    const siteName = getSiteName(settings);
                    const siteUrl = getServerSiteUrl();

                    await sendEmail({
                        to: (ticket.profiles as any).email,
                        subject: emailTemplates.supportResponse.subject(ticket.subject),
                        html: emailTemplates.supportResponse.html({
                            userName: (ticket.profiles as any).full_name || 'Utilisateur',
                            ticketSubject: ticket.subject,
                            adminMessage: message,
                            siteName,
                            siteUrl
                        }),
                    });
                }
            } catch (emailError) {
                console.error('Error sending support message email:', emailError);
            }
        }

        revalidatePath('/dashboard/support');
        revalidatePath('/admin/support');

        return createSuccessResponse('Message envoyé');
    } catch (error) {
        logError('send_support_message_unexpected', error);
        return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur');
    }
}

/**
 * Get all messages for a support ticket thread
 */
export async function getSupportTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('support_ticket_messages')
            .select(`
                *,
                profiles (
                    full_name,
                    role
                )
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            logError('get_support_ticket_messages', error, { ticketId });
            return [];
        }

        return (data || []).map((msg: any) => ({
            ...msg,
            sender_name: msg.profiles?.full_name || 'Utilisateur',
            sender_role: msg.profiles?.role
        })) as SupportMessage[];
    } catch (error) {
        logError('get_support_ticket_messages_unexpected', error);
        return [];
    }
}
