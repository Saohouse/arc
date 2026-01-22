-- CreateTable
CREATE TABLE "StoryMember" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "StoryMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryMember_storyId_idx" ON "StoryMember"("storyId");

-- CreateIndex
CREATE INDEX "StoryMember_userId_idx" ON "StoryMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryMember_storyId_userId_key" ON "StoryMember"("storyId", "userId");

-- AddForeignKey
ALTER TABLE "StoryMember" ADD CONSTRAINT "StoryMember_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryMember" ADD CONSTRAINT "StoryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
