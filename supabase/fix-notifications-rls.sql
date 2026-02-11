-- Fix RLS policies for notifications table
-- Ensure service role can insert notifications while restricting regular user access

-- First, let's check if the notifications table exists and what the current policies are
DO $$
BEGIN
  -- Check if notifications table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    
    -- Drop existing insert policy that allows authenticated users to insert
    DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
    
    -- Create a more restrictive policy that only allows service role to insert
    -- This is safer since notifications are typically system-generated
    CREATE POLICY "Service role can insert notifications" ON public.notifications
      FOR INSERT TO service_role
      WITH CHECK (true);
    
    -- For admin users who need to send notifications, we can create a specific policy
    -- This allows admins to insert notifications (for system messages, etc.)
    CREATE POLICY "Admins can insert notifications" ON public.notifications
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      );

    -- Update the select policy to handle global notifications (where user_id is NULL)
    -- This allows users to see their own notifications as well as global ones
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    CREATE POLICY "Users can view their own notifications" ON public.notifications
      FOR SELECT USING (
        auth.uid() = user_id 
        OR user_id IS NULL  -- Allows viewing global notifications
      );

    -- Make sure the update policy is properly set for marking as read
    DROP POLICY IF EXISTS "Users can update their own notifications (mark as read)" ON public.notifications;
    CREATE POLICY "Users can update their own notifications (mark as read)" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id);

    -- Add a policy for service role to manage all notifications
    CREATE POLICY "Service role can manage all notifications" ON public.notifications
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    RAISE NOTICE 'Notifications RLS policies updated successfully';
  
  ELSE
    RAISE NOTICE 'Notifications table does not exist, skipping RLS policy updates';
  END IF;
END $$;

-- Ensure proper indexes exist for performance
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    
    -- Index for user_id lookups (already exists but let's ensure it's there)
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
    
    -- Index for unread notifications (important for performance)
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
    
    -- Index for ordering by creation date (for chronological display)
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
    
    -- Composite index for common query pattern (user + read status)
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read_status ON public.notifications(user_id, is_read, created_at DESC);
    
    RAISE NOTICE 'Notifications indexes updated successfully';
  
  ELSE
    RAISE NOTICE 'Notifications table does not exist, skipping index creation';
  END IF;
END $$;