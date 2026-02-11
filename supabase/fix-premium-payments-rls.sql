-- Fix RLS policy for premium_payments table to allow users to insert their own payments

-- Create policy to allow users to insert their own payments
DO $$ 
BEGIN
  CREATE POLICY "Users can insert their own payments" ON premium_payments FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );
EXCEPTION
  WHEN duplicate_object THEN 
    -- Policy already exists, so we need to drop and recreate it
    DROP POLICY IF EXISTS "Users can insert their own payments" ON premium_payments;
    CREATE POLICY "Users can insert their own payments" ON premium_payments FOR INSERT WITH CHECK (
      auth.uid() = user_id
    );
END $$;

-- Also create policy to allow users to update their own payments if status is pending
DO $$ 
BEGIN
  CREATE POLICY "Users can update their own pending payments" ON premium_payments FOR UPDATE USING (
    auth.uid() = user_id AND status = 'pending'
  );
EXCEPTION
  WHEN duplicate_object THEN 
    -- Policy already exists, so we need to drop and recreate it
    DROP POLICY IF EXISTS "Users can update their own pending payments" ON premium_payments;
    CREATE POLICY "Users can update their own pending payments" ON premium_payments FOR UPDATE USING (
      auth.uid() = user_id AND status = 'pending'
    );
END $$;

-- Grant necessary permissions to authenticated users
GRANT INSERT ON premium_payments TO authenticated;
GRANT UPDATE ON premium_payments TO authenticated;