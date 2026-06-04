-- ============================================================================
-- Storage: private "recordings" bucket for audio/video (spec §8.5, SP6).
-- Files are stored under a per-user folder: "<user_id>/<filename>".
-- Policies ensure a user can only touch files inside their own folder.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "recordings_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recordings_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recordings_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recordings_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
