-- Keep the realm as the log reports it, alongside the normalised slug used for
-- identity. masterData actors carry a realm NAME, not a slug, and for CJK
-- realms slugification yields an empty string.
ALTER TABLE "Character" ADD COLUMN "realmName" TEXT NOT NULL DEFAULT '';
