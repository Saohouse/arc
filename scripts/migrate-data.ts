import { PrismaClient } from '@prisma/client';

// SQLite client (source)
const sqlite = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db',
    },
  },
});

// PostgreSQL client (destination) - uses DATABASE_URL from .env
const postgres = new PrismaClient();

async function migrateData() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Migrate Users
    console.log('Migrating users...');
    const users = await sqlite.user.findMany();
    for (const user of users) {
      await postgres.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log(`✅ Migrated ${users.length} users\n`);

    // Migrate Stories
    console.log('Migrating stories...');
    const stories = await sqlite.story.findMany();
    for (const story of stories) {
      await postgres.story.upsert({
        where: { id: story.id },
        update: story,
        create: story,
      });
    }
    console.log(`✅ Migrated ${stories.length} stories\n`);

    // Migrate Tags
    console.log('Migrating tags...');
    const tags = await sqlite.tag.findMany();
    for (const tag of tags) {
      await postgres.tag.upsert({
        where: { id: tag.id },
        update: tag,
        create: tag,
      });
    }
    console.log(`✅ Migrated ${tags.length} tags\n`);

    // Migrate Characters
    console.log('Migrating characters...');
    const characters = await sqlite.character.findMany();
    for (const char of characters) {
      const { wizardData, ...charData } = char;
      const updateData: any = { ...charData };
      const createData: any = { ...charData };
      
      if (wizardData !== null) {
        updateData.wizardData = wizardData;
        createData.wizardData = wizardData;
      }
      
      await postgres.character.upsert({
        where: { id: char.id },
        update: updateData,
        create: createData,
      });
    }
    console.log(`✅ Migrated ${characters.length} characters\n`);

    // Migrate Worlds
    console.log('Migrating worlds...');
    const worlds = await sqlite.world.findMany();
    for (const world of worlds) {
      await postgres.world.upsert({
        where: { id: world.id },
        update: world,
        create: world,
      });
    }
    console.log(`✅ Migrated ${worlds.length} worlds\n`);

    // Migrate Locations
    console.log('Migrating locations...');
    const locations = await sqlite.location.findMany();
    for (const location of locations) {
      await postgres.location.upsert({
        where: { id: location.id },
        update: location,
        create: location,
      });
    }
    console.log(`✅ Migrated ${locations.length} locations\n`);

    // Migrate Objects
    console.log('Migrating objects...');
    const objects = await sqlite.object.findMany();
    for (const obj of objects) {
      await postgres.object.upsert({
        where: { id: obj.id },
        update: obj,
        create: obj,
      });
    }
    console.log(`✅ Migrated ${objects.length} objects\n`);

    // Migrate Relationships
    console.log('Migrating relationships...');
    const relationships = await sqlite.relationship.findMany();
    for (const rel of relationships) {
      await postgres.relationship.upsert({
        where: { id: rel.id },
        update: rel,
        create: rel,
      });
    }
    console.log(`✅ Migrated ${relationships.length} relationships\n`);

    // Migrate Episodes
    console.log('Migrating episodes...');
    const episodes = await sqlite.episode.findMany();
    for (const episode of episodes) {
      await postgres.episode.upsert({
        where: { id: episode.id },
        update: episode,
        create: episode,
      });
    }
    console.log(`✅ Migrated ${episodes.length} episodes\n`);

    // Migrate Scenes
    console.log('Migrating scenes...');
    const scenes = await sqlite.scene.findMany();
    for (const scene of scenes) {
      await postgres.scene.upsert({
        where: { id: scene.id },
        update: scene,
        create: scene,
      });
    }
    console.log(`✅ Migrated ${scenes.length} scenes\n`);

    // Migrate Sagas
    console.log('Migrating sagas...');
    const sagas = await sqlite.saga.findMany();
    for (const saga of sagas) {
      await postgres.saga.upsert({
        where: { id: saga.id },
        update: saga,
        create: saga,
      });
    }
    console.log(`✅ Migrated ${sagas.length} sagas\n`);

    // Migrate Arcs
    console.log('Migrating arcs...');
    const arcs = await sqlite.arc.findMany();
    for (const arc of arcs) {
      await postgres.arc.upsert({
        where: { id: arc.id },
        update: arc,
        create: arc,
      });
    }
    console.log(`✅ Migrated ${arcs.length} arcs\n`);

    console.log('🎉 Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  }
}

migrateData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
