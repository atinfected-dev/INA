-- CreateEnum
CREATE TYPE "ImportState" AS ENUM ('DISCOVERED', 'FIGHTS_IMPORTED', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "ParseMetric" AS ENUM ('DPS', 'HPS');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('PERSON', 'CHARACTER');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('ALL', 'EXPANSION', 'ZONE', 'ENCOUNTER');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('FULL', 'INCREMENTAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "wclGuildId" INTEGER,
    "name" TEXT NOT NULL,
    "serverSlug" TEXT NOT NULL,
    "serverRegion" TEXT NOT NULL,
    "apiHost" TEXT NOT NULL DEFAULT 'https://classic.warcraftlogs.com',
    "faction" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expansion" (
    "id" TEXT NOT NULL,
    "wclExpansionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Expansion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "wclZoneId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "expansionId" TEXT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "wclEncounterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "journalId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Difficulty" (
    "id" TEXT NOT NULL,
    "wclDifficultyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Difficulty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneDifficulty" (
    "zoneId" TEXT NOT NULL,
    "difficultyId" TEXT NOT NULL,
    "sizes" INTEGER[],

    CONSTRAINT "ZoneDifficulty_pkey" PRIMARY KEY ("zoneId","difficultyId")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "wclCharacterId" INTEGER,
    "name" TEXT NOT NULL,
    "realmSlug" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "className" TEXT,
    "mainSpec" TEXT,
    "personId" TEXT,
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterNameHistory" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realmSlug" TEXT NOT NULL,
    "seenFrom" TIMESTAMP(3) NOT NULL,
    "seenTo" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterNameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT,
    "ownerName" TEXT,
    "zoneId" TEXT,
    "importState" "ImportState" NOT NULL DEFAULT 'DISCOVERED',
    "importError" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fight" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "wclFightId" INTEGER NOT NULL,
    "wclEncounterId" INTEGER NOT NULL,
    "encounterId" TEXT,
    "difficultyId" TEXT,
    "wclDifficulty" INTEGER,
    "size" INTEGER,
    "kill" BOOLEAN,
    "startOffsetMs" INTEGER NOT NULL,
    "endOffsetMs" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "bossPercentage" DOUBLE PRECISION,
    "fightPercentage" DOUBLE PRECISION,
    "lastPhase" INTEGER,
    "averageItemLevel" DOUBLE PRECISION,
    "hardModeLevel" INTEGER,
    "completeRaid" BOOLEAN NOT NULL DEFAULT false,
    "wipeCalledMs" INTEGER,

    CONSTRAINT "Fight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FightParticipant" (
    "id" TEXT NOT NULL,
    "fightId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "spec" TEXT,
    "role" TEXT,
    "itemLevel" INTEGER,

    CONSTRAINT "FightParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FightPerformance" (
    "id" TEXT NOT NULL,
    "fightId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" TEXT,
    "spec" TEXT,
    "damageDone" BIGINT NOT NULL DEFAULT 0,
    "bossDamageDone" BIGINT NOT NULL DEFAULT 0,
    "damageTaken" BIGINT NOT NULL DEFAULT 0,
    "healingDone" BIGINT NOT NULL DEFAULT 0,
    "overhealing" BIGINT NOT NULL DEFAULT 0,
    "dps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "interrupts" INTEGER NOT NULL DEFAULT 0,
    "dispels" INTEGER NOT NULL DEFAULT 0,
    "activeTimeMs" INTEGER NOT NULL DEFAULT 0,
    "itemLevel" INTEGER,

    CONSTRAINT "FightPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParseRanking" (
    "id" TEXT NOT NULL,
    "fightId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "metric" "ParseMetric" NOT NULL,
    "rankPercent" DOUBLE PRECISION NOT NULL,
    "bracketPercent" DOUBLE PRECISION,
    "spec" TEXT,
    "partition" INTEGER,

    CONSTRAINT "ParseRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeathEvent" (
    "id" TEXT NOT NULL,
    "fightId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "abilityId" INTEGER,
    "abilityName" TEXT,
    "sourceName" TEXT,

    CONSTRAINT "DeathEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidSession" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "RaidSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionReport" (
    "sessionId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,

    CONSTRAINT "SessionReport_pkey" PRIMARY KEY ("sessionId","reportId")
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "personId" TEXT,
    "activeMs" INTEGER NOT NULL,
    "participation" DOUBLE PRECISION NOT NULL,
    "isPresent" BOOLEAN NOT NULL,

    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AggregateStat" (
    "id" TEXT NOT NULL,
    "subjectType" "SubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT,
    "difficultyId" TEXT,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AggregateStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "newReports" INTEGER NOT NULL DEFAULT 0,
    "newFights" INTEGER NOT NULL DEFAULT 0,
    "pointsSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_wclGuildId_key" ON "Guild"("wclGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_serverSlug_serverRegion_key" ON "Guild"("name", "serverSlug", "serverRegion");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Expansion_wclExpansionId_key" ON "Expansion"("wclExpansionId");

-- CreateIndex
CREATE UNIQUE INDEX "Expansion_slug_key" ON "Expansion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_wclZoneId_key" ON "Zone"("wclZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_slug_key" ON "Zone"("slug");

-- CreateIndex
CREATE INDEX "Zone_expansionId_idx" ON "Zone"("expansionId");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_wclEncounterId_key" ON "Encounter"("wclEncounterId");

-- CreateIndex
CREATE INDEX "Encounter_zoneId_idx" ON "Encounter"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_zoneId_slug_key" ON "Encounter"("zoneId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Difficulty_wclDifficultyId_key" ON "Difficulty"("wclDifficultyId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Character_wclCharacterId_key" ON "Character"("wclCharacterId");

-- CreateIndex
CREATE INDEX "Character_personId_idx" ON "Character"("personId");

-- CreateIndex
CREATE INDEX "Character_className_idx" ON "Character"("className");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_realmSlug_region_key" ON "Character"("name", "realmSlug", "region");

-- CreateIndex
CREATE INDEX "CharacterNameHistory_characterId_idx" ON "CharacterNameHistory"("characterId");

-- CreateIndex
CREATE INDEX "CharacterNameHistory_name_idx" ON "CharacterNameHistory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Report_code_key" ON "Report"("code");

-- CreateIndex
CREATE INDEX "Report_guildId_startTime_idx" ON "Report"("guildId", "startTime");

-- CreateIndex
CREATE INDEX "Report_importState_idx" ON "Report"("importState");

-- CreateIndex
CREATE INDEX "Fight_encounterId_kill_idx" ON "Fight"("encounterId", "kill");

-- CreateIndex
CREATE INDEX "Fight_startTime_idx" ON "Fight"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Fight_reportId_wclFightId_key" ON "Fight"("reportId", "wclFightId");

-- CreateIndex
CREATE INDEX "FightParticipant_characterId_idx" ON "FightParticipant"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FightParticipant_fightId_characterId_key" ON "FightParticipant"("fightId", "characterId");

-- CreateIndex
CREATE INDEX "FightPerformance_characterId_idx" ON "FightPerformance"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FightPerformance_fightId_characterId_key" ON "FightPerformance"("fightId", "characterId");

-- CreateIndex
CREATE INDEX "ParseRanking_characterId_metric_idx" ON "ParseRanking"("characterId", "metric");

-- CreateIndex
CREATE INDEX "ParseRanking_rankPercent_idx" ON "ParseRanking"("rankPercent");

-- CreateIndex
CREATE UNIQUE INDEX "ParseRanking_fightId_characterId_metric_key" ON "ParseRanking"("fightId", "characterId", "metric");

-- CreateIndex
CREATE INDEX "DeathEvent_characterId_idx" ON "DeathEvent"("characterId");

-- CreateIndex
CREATE INDEX "DeathEvent_fightId_idx" ON "DeathEvent"("fightId");

-- CreateIndex
CREATE INDEX "DeathEvent_abilityId_idx" ON "DeathEvent"("abilityId");

-- CreateIndex
CREATE INDEX "RaidSession_guildId_date_idx" ON "RaidSession"("guildId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RaidSession_guildId_startTime_key" ON "RaidSession"("guildId", "startTime");

-- CreateIndex
CREATE INDEX "SessionAttendance_personId_idx" ON "SessionAttendance"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttendance_sessionId_characterId_key" ON "SessionAttendance"("sessionId", "characterId");

-- CreateIndex
CREATE INDEX "AggregateStat_metric_scopeType_scopeId_value_idx" ON "AggregateStat"("metric", "scopeType", "scopeId", "value");

-- CreateIndex
CREATE INDEX "AggregateStat_subjectType_subjectId_idx" ON "AggregateStat"("subjectType", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "AggregateStat_subjectType_subjectId_scopeType_scopeId_diffi_key" ON "AggregateStat"("subjectType", "subjectId", "scopeType", "scopeId", "difficultyId", "metric");

-- CreateIndex
CREATE INDEX "SyncRun_guildId_startedAt_idx" ON "SyncRun"("guildId", "startedAt");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_expansionId_fkey" FOREIGN KEY ("expansionId") REFERENCES "Expansion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneDifficulty" ADD CONSTRAINT "ZoneDifficulty_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneDifficulty" ADD CONSTRAINT "ZoneDifficulty_difficultyId_fkey" FOREIGN KEY ("difficultyId") REFERENCES "Difficulty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterNameHistory" ADD CONSTRAINT "CharacterNameHistory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fight" ADD CONSTRAINT "Fight_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fight" ADD CONSTRAINT "Fight_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fight" ADD CONSTRAINT "Fight_difficultyId_fkey" FOREIGN KEY ("difficultyId") REFERENCES "Difficulty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightParticipant" ADD CONSTRAINT "FightParticipant_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "Fight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightParticipant" ADD CONSTRAINT "FightParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightPerformance" ADD CONSTRAINT "FightPerformance_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "Fight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightPerformance" ADD CONSTRAINT "FightPerformance_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseRanking" ADD CONSTRAINT "ParseRanking_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "Fight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseRanking" ADD CONSTRAINT "ParseRanking_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathEvent" ADD CONSTRAINT "DeathEvent_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "Fight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathEvent" ADD CONSTRAINT "DeathEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSession" ADD CONSTRAINT "RaidSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RaidSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RaidSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
