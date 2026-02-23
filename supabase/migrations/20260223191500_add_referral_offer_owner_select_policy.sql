-- Ensure referral offer creators can always read their own offers (including paused/closed/rejected).

drop policy if exists "Users can read own referral offers" on public.job_referral_offers;
create policy "Users can read own referral offers"
on public.job_referral_offers for select
to authenticated
using (auth.uid() = user_id);
