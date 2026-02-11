-- Storage buckets + RLS policies for buckets referenced by src/

alter table storage.objects enable row level security;

insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values
  ('claim-proofs', 'claim-proofs', false, false, 104857600, '{application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm}'),
  ('business-images', 'business-images', true, true, 104857600, '{image/jpeg,image/png,image/webp,image/gif,image/svg+xml}'),
  ('carousel-images', 'carousel-images', true, true, 104857600, '{image/jpeg,image/png,image/webp,image/gif,image/svg+xml}')
on conflict (id) do nothing;

do $$ begin
  create policy "Allow authenticated users to upload claim proofs"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'claim-proofs');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to update claim proofs"
    on storage.objects for update to authenticated
    using (bucket_id = 'claim-proofs');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to delete claim proofs"
    on storage.objects for delete to authenticated
    using (bucket_id = 'claim-proofs');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow public read access to business images"
    on storage.objects for select to public
    using (bucket_id = 'business-images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to upload business images"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'business-images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to update business images"
    on storage.objects for update to authenticated
    using (bucket_id = 'business-images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to delete business images"
    on storage.objects for delete to authenticated
    using (bucket_id = 'business-images');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow public read access to carousel images"
    on storage.objects for select to public
    using (bucket_id = 'carousel-images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to upload carousel images"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'carousel-images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to update carousel images"
    on storage.objects for update to authenticated
    using (bucket_id = 'carousel-images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow authenticated users to delete carousel images"
    on storage.objects for delete to authenticated
    using (bucket_id = 'carousel-images');
exception when duplicate_object then null; end $$;

grant usage on schema storage to authenticated;
grant all on storage.objects to authenticated;

