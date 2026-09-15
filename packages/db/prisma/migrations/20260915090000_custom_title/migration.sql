-- Hall of Fame titles awarded by hand, with no metric behind them: the kind
-- of honour a guild gives for things no log records — falling asleep mid-raid,
-- four years of saying nothing on voice. Officers name the holder; the page
-- says a person, not a number, decided it.
CREATE TABLE "CustomTitle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "holderClass" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomTitle_pkey" PRIMARY KEY ("id")
);
