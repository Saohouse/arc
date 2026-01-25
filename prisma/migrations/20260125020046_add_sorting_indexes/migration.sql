-- CreateIndex
CREATE INDEX "Character_storyId_name_idx" ON "Character"("storyId", "name");

-- CreateIndex
CREATE INDEX "Character_storyId_createdAt_idx" ON "Character"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "Location_storyId_name_idx" ON "Location"("storyId", "name");

-- CreateIndex
CREATE INDEX "Location_storyId_createdAt_idx" ON "Location"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "Object_storyId_name_idx" ON "Object"("storyId", "name");

-- CreateIndex
CREATE INDEX "Object_storyId_createdAt_idx" ON "Object"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "World_storyId_name_idx" ON "World"("storyId", "name");

-- CreateIndex
CREATE INDEX "World_storyId_createdAt_idx" ON "World"("storyId", "createdAt");
