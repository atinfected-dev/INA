-- Zone slugs are not unique at all.
-- Warcraft Logs creates a separate zone for every re-release of a raid; the
-- pairs share a name and an expansion but differ in partitions and
-- difficulties (Ulduar 1017 vs 1026, Naxxramas 1006 vs 1036). Both are real
-- and must be kept, so identity is wclZoneId and the slug is display only.
DROP INDEX "Zone_expansionId_slug_key";

CREATE INDEX "Zone_slug_idx" ON "Zone"("slug");
