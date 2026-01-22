import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupStoryMembers() {
  console.log("🔄 Setting up story memberships...\n");

  // Get all stories
  const stories = await prisma.story.findMany();
  console.log(`📚 Found ${stories.length} stories\n`);

  if (stories.length === 0) {
    console.log("✅ No stories to process!");
    return;
  }

  // Get all users
  const users = await prisma.user.findMany();
  console.log(`👥 Found ${users.length} users\n`);

  if (users.length === 0) {
    console.log("❌ No users found! Please create a user first.");
    return;
  }

  // For each story, check if it has any members
  for (const story of stories) {
    const existingMembers = await prisma.storyMember.count({
      where: { storyId: story.id },
    });

    if (existingMembers > 0) {
      console.log(`✓ Story "${story.name}" already has ${existingMembers} member(s)`);
      continue;
    }

    // No members yet - add the first user (or all users) as owner
    // Option 1: Add first user as owner (recommended)
    const firstUser = users[0];
    await prisma.storyMember.create({
      data: {
        storyId: story.id,
        userId: firstUser.id,
        role: "owner",
        viewedAt: new Date(), // Mark as viewed since they created it
      },
    });

    console.log(`✅ Added ${firstUser.email} as owner of "${story.name}"`);

    // Option 2: Uncomment below to add ALL users as owners
    // (useful if you have multiple team members)
    /*
    for (const user of users) {
      await prisma.storyMember.create({
        data: {
          storyId: story.id,
          userId: user.id,
          role: "owner",
          viewedAt: new Date(),
        },
      });
      console.log(`✅ Added ${user.email} as owner of "${story.name}"`);
    }
    */
  }

  console.log("\n🎉 Done! All stories now have owners.");
}

setupStoryMembers()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
