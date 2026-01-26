import { PrismaClient } from '@prisma/client';

// Use DIRECT_URL for migrations (has write permissions)
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
});

async function main() {
  console.log('Running location hierarchy migration...');
  
  try {
    // Add columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Location" 
      ADD COLUMN IF NOT EXISTS "locationType" TEXT,
      ADD COLUMN IF NOT EXISTS "parentLocationId" TEXT;
    `);
    console.log('✓ Added columns');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Location_parentLocationId_idx" 
      ON "Location"("parentLocationId");
    `);
    console.log('✓ Created parentLocationId index');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Location_locationType_idx" 
      ON "Location"("locationType");
    `);
    console.log('✓ Created locationType index');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Location_storyId_locationType_idx" 
      ON "Location"("storyId", "locationType");
    `);
    console.log('✓ Created storyId_locationType index');

    // Add foreign key (check if it exists first)
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'Location_parentLocationId_fkey'
        ) THEN
          ALTER TABLE "Location" 
          ADD CONSTRAINT "Location_parentLocationId_fkey" 
          FOREIGN KEY ("parentLocationId") 
          REFERENCES "Location"("id") 
          ON DELETE SET NULL 
          ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✓ Added foreign key constraint');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
