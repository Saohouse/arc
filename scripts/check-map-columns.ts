import { prisma } from "../lib/prisma";

async function checkColumns() {
  try {
    console.log('Checking if map visualization columns exist...\n');
    
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Location'
      AND column_name IN ('mapX', 'mapY', 'mapZoom', 'iconType', 'iconData')
      ORDER BY column_name;
    `;
    
    console.log('Map visualization columns:', result);
    
    if (Array.isArray(result) && result.length === 5) {
      console.log('\n✅ All map visualization columns exist in database!');
      console.log('✅ Migration was already applied by Vercel deployment');
    } else {
      console.log(`\n⚠️  Found ${Array.isArray(result) ? result.length : 0} out of 5 expected columns`);
      console.log('Migration may not have been applied yet');
    }
  } catch (error) {
    console.error('❌ Error checking columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
