-- Zone slugs are unique per expansion, not globally.
-- Raid names repeat across expansions (Naxxramas exists in both Classic and
-- Wrath of the Lich King), so a global unique slug would fail on import.
DROP INDEX "Zone_slug_key";

CREATE UNIQUE INDEX "Zone_expansionId_slug_key" ON "Zone"("expansionId", "slug");
