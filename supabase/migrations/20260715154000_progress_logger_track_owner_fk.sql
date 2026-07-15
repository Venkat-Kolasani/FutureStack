-- =============================================================================
-- Progress Logger ownership integrity follow-up
-- =============================================================================
-- Apply the composite track/user constraint to databases that already ran
-- 20260715151132_progress_logger.sql before this invariant was added.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'progress_tracks'::regclass
      AND conname = 'progress_tracks_id_user_id_key'
  ) THEN
    ALTER TABLE progress_tracks
      ADD CONSTRAINT progress_tracks_id_user_id_key UNIQUE (id, user_id);
  END IF;
END $$;

ALTER TABLE progress_logs
  DROP CONSTRAINT IF EXISTS progress_logs_track_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'progress_logs'::regclass
      AND conname = 'progress_logs_track_user_fkey'
  ) THEN
    ALTER TABLE progress_logs
      ADD CONSTRAINT progress_logs_track_user_fkey
      FOREIGN KEY (track_id, user_id)
      REFERENCES progress_tracks(id, user_id)
      ON DELETE CASCADE;
  END IF;
END $$;
