-- Forever characters carry a first and a last name; Hall of Fame titles
-- belong to an era, so the Forever hall starts empty while the Classic hall
-- keeps everything it has.
ALTER TABLE "ForeverCharacter" ADD COLUMN "surname" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomTitle" ADD COLUMN "era" TEXT NOT NULL DEFAULT 'classic';
CREATE INDEX "CustomTitle_era_idx" ON "CustomTitle"("era");
