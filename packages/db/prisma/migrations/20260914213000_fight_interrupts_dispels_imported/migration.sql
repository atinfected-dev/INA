-- Interrupts and dispels arrive from two tables in one request per fight, so a
-- single flag covers both. Same purpose as damageTakenImported: the backfill
-- runs for hours and has to be resumable.
ALTER TABLE "Fight" ADD COLUMN "interruptsDispelsImported" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Fight_interruptsDispelsImported_idx" ON "Fight"("interruptsDispelsImported");
