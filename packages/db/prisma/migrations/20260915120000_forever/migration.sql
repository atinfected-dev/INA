-- World of Warcraft: Forever (announced 2026-09-12, launching 2026-11-04).
--
-- The character a member intends to play there, and the officers' notes,
-- guides and raid sheets for it. Kept apart from the imported history: the
-- Classic data is a record of what happened; this is a plan for what comes.
CREATE TABLE "ForeverCharacter" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "faction" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverCharacter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ForeverCharacter_accountId_key" ON "ForeverCharacter"("accountId");
ALTER TABLE "ForeverCharacter" ADD CONSTRAINT "ForeverCharacter_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ForeverPost" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeverPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ForeverPost_kind_pinned_createdAt_idx" ON "ForeverPost"("kind", "pinned", "createdAt");
