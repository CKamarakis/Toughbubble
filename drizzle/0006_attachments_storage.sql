-- Private bucket for note attachments (attachments design D1). Objects live at
-- <owner_id>/<item_id>/<attachment_id>; the 5 MB limit is enforced by Storage.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments', 'attachments', false, 5242880)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880;
--> statement-breakpoint
-- Owner-only access: the first path segment must be the caller's user id.
-- No UPDATE policy, so a stored file can't be replaced or moved.
CREATE POLICY "attachments_objects_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "attachments_objects_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "attachments_objects_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = (select auth.uid())::text);
