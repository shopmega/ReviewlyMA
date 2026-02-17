import { createAdminClient } from '@/lib/supabase/admin';

type AdminNotificationInput = {
  title: string;
  message: string;
  type: string;
  link?: string;
};

export async function notifyAdmins(input: AdminNotificationInput): Promise<void> {
  try {
    const adminClient = await createAdminClient();

    const { data: admins, error: adminsError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (adminsError) {
      console.error('Error fetching admin users for notification:', adminsError);
      return;
    }

    const adminIds = (admins ?? [])
      .map((admin: { id: string | null }) => admin.id)
      .filter((id): id is string => Boolean(id));

    if (adminIds.length === 0) {
      return;
    }

    const notifications = adminIds.map((adminId) => ({
      user_id: adminId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link ?? null,
      is_read: false,
    }));

    const { error: insertError } = await adminClient
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting admin notifications:', insertError);
    }
  } catch (error) {
    console.error('Unexpected error while notifying admins:', error);
  }
}
