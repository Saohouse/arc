-- AlterTable
ALTER TABLE "Location" ADD COLUMN "locationType" TEXT,
ADD COLUMN "parentLocationId" TEXT;

-- CreateIndex
CREATE INDEX "Location_parentLocationId_idx" ON "Location"("parentLocationId");

-- CreateIndex
CREATE INDEX "Location_locationType_idx" ON "Location"("locationType");

-- CreateIndex
CREATE INDEX "Location_storyId_locationType_idx" ON "Location"("storyId", "locationType");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentLocationId_fkey" FOREIGN KEY ("parentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
