-- The guild-name poll: candidates and one vote per member and name.
CREATE TABLE "GuildNameOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuildNameOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuildNameOption_name_key" ON "GuildNameOption"("name");

CREATE TABLE "GuildNameVote" (
    "optionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuildNameVote_pkey" PRIMARY KEY ("optionId", "accountId")
);
CREATE INDEX "GuildNameVote_accountId_idx" ON "GuildNameVote"("accountId");
ALTER TABLE "GuildNameVote" ADD CONSTRAINT "GuildNameVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "GuildNameOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildNameVote" ADD CONSTRAINT "GuildNameVote_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The candidates, in the order they were proposed.
INSERT INTO "GuildNameOption" ("id", "name", "sortOrder") VALUES
  (gen_random_uuid()::text, 'Is not forever', 0),
  (gen_random_uuid()::text, 'Is Not Alone', 1),
  (gen_random_uuid()::text, 'Forever Not Alone', 2),
  (gen_random_uuid()::text, 'Never Apart', 3),
  (gen_random_uuid()::text, 'Still Together', 4),
  (gen_random_uuid()::text, 'Not Alone', 5),
  (gen_random_uuid()::text, 'Drawn together', 6),
  (gen_random_uuid()::text, 'No Horde Stands Alone', 7),
  (gen_random_uuid()::text, 'Hording Together', 8),
  (gen_random_uuid()::text, 'Not Alone - All One', 9),
  (gen_random_uuid()::text, 'We listen and we Dont Judge', 10),
  (gen_random_uuid()::text, 'Is not a Bollo', 11),
  (gen_random_uuid()::text, 'Together Matters', 12),
  (gen_random_uuid()::text, 'The Fellowship', 13),
  (gen_random_uuid()::text, 'United as One', 14),
  (gen_random_uuid()::text, 'Horde Unity', 15);
