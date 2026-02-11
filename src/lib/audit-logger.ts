import { createAdminClient } from './supabase/admin';

export type AdminAction =
    | 'DELETE_REVIEW'
    | 'APPROVE_CLAIM'
    | 'REJECT_CLAIM'
    | 'UPDATE_ROLE'
    | 'UPDATE_SITE_SETTINGS'
    | 'DELETE_BUSINESS'
    | 'MEDIA_ACTION';

export interface AuditLogOptions {
    adminId: string;
    action: AdminAction | string;
    targetType: string;
    targetId?: string;
    details?: any;
}

/**
 * Logs an admin action to the audit_logs table.
 * Should be called from server actions after a successful admin operation.
 */
export async function logAuditAction(options: AuditLogOptions) {
    const { adminId, action, targetType, targetId, details } = options;

    try {
        const supabase = await createAdminClient();

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                admin_id: adminId,
                action,
                target_type: targetType,
                target_id: targetId,
                details: details || {}
            });

        if (error) {
            console.error('Failed to log audit action:', error);
        }
    } catch (err) {
        console.error('Error in logAuditAction:', err);
    }
}
