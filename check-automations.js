const { PrismaClient } = require('@prisma/client');

// Use SQLite database directly
process.env.DATABASE_URL = 'file:./prisma/dev.db';
const prisma = new PrismaClient();

async function checkAutomations() {
  try {
    const automations = await prisma.automation.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        userId: true,
        triggerType: true,
        keywords: true,
        active: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('=== ACTIVE AUTOMATIONS ===');
    automations.forEach(auto => {
      console.log(`ID: ${auto.id}`);
      console.log(`Name: ${auto.name}`);
      console.log(`User: ${auto.userId}`);
      console.log(`Type: ${auto.triggerType}`);
      console.log(`Keywords: ${JSON.stringify(auto.keywords)}`);
      console.log(`Created: ${auto.createdAt}`);
      console.log('---');
    });
    
    console.log(`Total active automations: ${automations.length}`);
    
    // Check for potential duplicates by keywords and trigger type
    const duplicateGroups = new Map();
    automations.forEach(auto => {
      const key = `${auto.triggerType}_${JSON.stringify(auto.keywords)}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key).push(auto);
    });
    
    console.log('\n=== DUPLICATE CHECK ===');
    let foundDuplicates = false;
    duplicateGroups.forEach((group, key) => {
      if (group.length > 1) {
        foundDuplicates = true;
        console.log(`DUPLICATE FOUND for ${key}:`);
        group.forEach(auto => {
          console.log(`  - ${auto.name} (ID: ${auto.id}) - User: ${auto.userId}`);
        });
      }
    });
    
    if (!foundDuplicates) {
      console.log('No duplicates found based on trigger type and keywords.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAutomations();
