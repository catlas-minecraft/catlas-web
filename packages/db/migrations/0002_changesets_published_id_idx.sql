CREATE INDEX IF NOT EXISTS changesets_published_id_desc_idx
  ON core.changesets (id DESC)
  WHERE status = 'published';
