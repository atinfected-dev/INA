-- Per-fight damage taken requires one API call per fight; this flag makes the
-- backfill resumable after an interruption.
ALTER TABLE "Fight" ADD COLUMN "damageTakenImported" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Fight_damageTakenImported_idx" ON "Fight"("damageTakenImported");
