-- Shared Forever talent builds and their votes.
CREATE TABLE "ForeverBuild" (
    "id" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "authorId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForeverBuild_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ForeverBuild_className_score_idx" ON "ForeverBuild"("className", "score");
CREATE INDEX "ForeverBuild_className_views_idx" ON "ForeverBuild"("className", "views");
CREATE INDEX "ForeverBuild_className_createdAt_idx" ON "ForeverBuild"("className", "createdAt");
ALTER TABLE "ForeverBuild" ADD CONSTRAINT "ForeverBuild_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ForeverBuildVote" (
    "buildId" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForeverBuildVote_pkey" PRIMARY KEY ("buildId", "voterHash")
);
ALTER TABLE "ForeverBuildVote" ADD CONSTRAINT "ForeverBuildVote_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "ForeverBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
