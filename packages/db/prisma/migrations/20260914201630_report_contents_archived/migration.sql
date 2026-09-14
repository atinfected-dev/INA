-- Remember which reports Warcraft Logs has archived, so their contents are not
-- requested again on every import run.
ALTER TABLE "Report" ADD COLUMN "contentsArchived" BOOLEAN NOT NULL DEFAULT false;
