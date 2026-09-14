-- Registered members, their sessions, and their character claims.
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "realName" TEXT,
    "displayName" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE UNIQUE INDEX "Account_personId_key" ON "Account"("personId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX "Session_accountId_idx" ON "Session"("accountId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CharacterClaim" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    CONSTRAINT "CharacterClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterClaim_accountId_characterId_key"
    ON "CharacterClaim"("accountId", "characterId");
CREATE INDEX "CharacterClaim_status_idx" ON "CharacterClaim"("status");
CREATE INDEX "CharacterClaim_characterId_idx" ON "CharacterClaim"("characterId");

ALTER TABLE "CharacterClaim" ADD CONSTRAINT "CharacterClaim_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterClaim" ADD CONSTRAINT "CharacterClaim_characterId_fkey"
    FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
