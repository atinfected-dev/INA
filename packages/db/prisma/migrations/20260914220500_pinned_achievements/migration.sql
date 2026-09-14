-- Up to six achievements a member pins to the top of their profile.
--
-- An array on the account rather than a join table: the order IS the content
-- here, the list is capped at six, and nothing ever queries "who pinned this".
-- A join table would buy referential integrity against achievement ids that
-- live in code, not in the database, so it would buy nothing.
ALTER TABLE "Account" ADD COLUMN "pinnedAchievements" TEXT[] NOT NULL DEFAULT '{}';
