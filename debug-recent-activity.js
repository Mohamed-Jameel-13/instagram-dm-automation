const { PrismaClient } = require('@prisma/client');

// Use SQLite database directly for local development
process.env.DATABASE_URL = 'file:./prisma/dev.db';
const prisma = new PrismaClient();

async function checkRecentActivity() {
  try {
    console.log('=== RECENT AUTOMATION LOGS (Last 2 hours) ===');
    
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const recentLogs = await prisma.automationLog.findMany({
      where: {
        triggeredAt: {
          gte: twoHoursAgo
        }
      },
      orderBy: { triggeredAt: 'desc' },
      take: 50
    });
    
    console.log(`Found ${recentLogs.length} recent automation triggers:`);
    
    // Group by user and trigger text to find duplicates
    const groupedLogs = new Map();
    
    recentLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.triggeredAt}] Automation: ${log.automationId}`);
      console.log(`   User: ${log.userId} (${log.username})`);
      console.log(`   Type: ${log.triggerType}`);
      console.log(`   Text: "${log.triggerText}"`);
      console.log(`   New Follower: ${log.isNewFollower}`);
      console.log('   ---');
      
      // Group for duplicate detection
      const key = `${log.userId}_${log.triggerText}_${log.automationId}`;
      if (!groupedLogs.has(key)) {
        groupedLogs.set(key, []);
      }
      groupedLogs.get(key).push(log);
    });
    
    console.log('\n=== DUPLICATE DETECTION ===');
    let foundDuplicates = false;
    
    groupedLogs.forEach((logs, key) => {
      if (logs.length > 1) {
        foundDuplicates = true;
        console.log(`🚨 DUPLICATE FOUND: ${key}`);
        console.log(`   Count: ${logs.length} times`);
        logs.forEach((log, i) => {
          console.log(`   ${i + 1}. ${log.triggeredAt} (ID: ${log.id})`);
        });
        
        // Check time gaps between duplicates
        if (logs.length >= 2) {
          const timeDiff = new Date(logs[0].triggeredAt) - new Date(logs[1].triggeredAt);
          console.log(`   Time gap: ${timeDiff}ms (${timeDiff/1000}s)`);
        }
        console.log('');
      }
    });
    
    if (!foundDuplicates) {
      console.log('✅ No duplicates found in recent logs');
    }
    
    // Check active automations
    console.log('\n=== ACTIVE AUTOMATIONS ===');
    
    const automations = await prisma.automation.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        userId: true,
        triggerType: true,
        keywords: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${automations.length} active automations:`);
    
    // Check for potential automation duplicates
    const autoGroups = new Map();
    automations.forEach(auto => {
      const key = `${auto.userId}_${auto.triggerType}_${auto.keywords}`;
      if (!autoGroups.has(key)) {
        autoGroups.set(key, []);
      }
      autoGroups.get(key).push(auto);
    });
    
    let autoDuplicates = false;
    autoGroups.forEach((group, key) => {
      if (group.length > 1) {
        autoDuplicates = true;
        console.log(`🚨 DUPLICATE AUTOMATION: ${key}`);
        group.forEach(auto => {
          console.log(`   - ${auto.name} (ID: ${auto.id}) - Created: ${auto.createdAt}`);
        });
      } else {
        const auto = group[0];
        console.log(`✅ ${auto.name} (ID: ${auto.id})`);
        console.log(`   User: ${auto.userId}`);
        console.log(`   Type: ${auto.triggerType}`);
        console.log(`   Keywords: ${auto.keywords}`);
      }
    });
    
    if (!autoDuplicates) {
      console.log('\n✅ No duplicate automations found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentActivity();
