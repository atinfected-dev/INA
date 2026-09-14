-- Content officers add themselves: achievements and records beyond the ones
-- defined in code.
--
-- An achievement is a threshold on a metric, so a custom one is just a row
-- naming a metric and its steps — evaluated by the same code as the built-in
-- ones. A record is either "the highest value of a metric" (computed) or a
-- manual entry for something the logs cannot know (a first kill date, a guild
-- event); manual entries are marked as such wherever they appear.
--
-- Hall of Fame titles need no table: they already live in the Setting row.

CREATE TABLE "CustomAchievement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomRecord" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "metric" TEXT,
    "unit" TEXT,
    "value" TEXT,
    "holder" TEXT,
    "holderClass" TEXT,
    "context" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomRecord_pkey" PRIMARY KEY ("id")
);
