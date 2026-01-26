import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('Environment check:', {
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasDirectUrl: !!process.env.DIRECT_URL,
  directUrlPreview: process.env.DIRECT_URL?.substring(0, 50) + '...'
});

// Use DIRECT_URL for migrations (has write permissions)
// Override SSL mode to disable if there are certificate issues
const directUrl = process.env.DIRECT_URL?.replace('sslmode=no-verify', 'sslmode=disable');

const prisma = new PrismaClient({
  datasourceUrl: directUrl,
});

async function main() {
  console.log('Running map visualization migration...');
  
  try {
    // Add map visualization columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Location" 
      ADD COLUMN IF NOT EXISTS "mapX" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "mapY" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "mapZoom" INTEGER,
      ADD COLUMN IF NOT EXISTS "iconType" TEXT DEFAULT 'emoji',
      ADD COLUMN IF NOT EXISTS "iconData" TEXT;
    `);
    console.log('✓ Added map visualization columns');

    console.log('\n✅ Migration completed successfully!');
    
    // Verify the new columns exist
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'Location'
      AND column_name IN ('mapX', 'mapY', 'mapZoom', 'iconType', 'iconData')
      ORDER BY column_name;
    `;
    
    console.log('\n✅ New columns verified:', result);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
