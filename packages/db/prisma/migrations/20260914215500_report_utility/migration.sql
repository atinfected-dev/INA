-- Interrupts and dispels are stored per report, not per fight.
--
-- The API refuses a report-wide table() with fightIDs, but accepts a time
-- range covering the whole log — and then charges the same handful of points
-- for the entire report as for a single pull. Per fight the backfill would
-- cost about 43.000 points and run for hours; per report it costs roughly
-- 6.700 and runs in twenty minutes.
--
-- What that gives up is boss attribution: the response sums every fight in the
-- range with no per-fight breakdown and no fight id on the entries, so a split
-- could only be invented. Storing at the granularity actually fetched keeps
-- the numbers honest; a finer import can be added later without touching this.
DROP INDEX IF EXISTS "Fight_interruptsDispelsImported_idx";
ALTER TABLE "Fight" DROP COLUMN IF EXISTS "interruptsDispelsImported";

ALTER TABLE "Report" ADD COLUMN "utilityImported" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Report_utilityImported_idx" ON "Report"("utilityImported");

CREATE TABLE "ReportUtility" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "interrupts" INTEGER NOT NULL DEFAULT 0,
    "dispels" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReportUtility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportUtility_reportId_characterId_key" ON "ReportUtility"("reportId", "characterId");
CREATE INDEX "ReportUtility_characterId_idx" ON "ReportUtility"("characterId");

ALTER TABLE "ReportUtility" ADD CONSTRAINT "ReportUtility_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportUtility" ADD CONSTRAINT "ReportUtility_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
