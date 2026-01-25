-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Object" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StoryMember" ALTER COLUMN "role" SET DEFAULT 'editor';

-- AlterTable
ALTER TABLE "World" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Character_storyId_order_idx" ON "Character"("storyId", "order");

-- CreateIndex
CREATE INDEX "Location_storyId_order_idx" ON "Location"("storyId", "order");

-- CreateIndex
CREATE INDEX "Object_storyId_order_idx" ON "Object"("storyId", "order");

-- CreateIndex
CREATE INDEX "World_storyId_order_idx" ON "World"("storyId", "order");
