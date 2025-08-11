const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create a test user first
  let user = await prisma.user.findFirst({
    where: {
      email: 'test@example.com'
    }
  })
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: '6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2', // Use the user ID from the error log
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log('✅ Created test user:', user.email)
  } else {
    console.log('✅ Found existing user:', user.email)
  }

  // Create the TESTING automation that was being used
  const testingAutomation = await prisma.automation.upsert({
    where: {
      id: 'cmdvrqtwv0003hk28h1y5qg7t' // Use the automation ID from the error log
    },
    update: {
      name: "TESTING",
      triggerType: "comment",
      actionType: "message", 
      keywords: JSON.stringify(["no"]),
      message: "This is a test response message for debugging duplicates.",
      commentReply: "",
      aiPrompt: "",
      posts: JSON.stringify([]),
      active: true,
      userId: user.id,
      dmMode: "normal"
    },
    create: {
      id: 'cmdvrqtwv0003hk28h1y5qg7t',
      name: "TESTING",
      triggerType: "comment", 
      actionType: "message",
      keywords: JSON.stringify(["no"]),
      message: "This is a test response message for debugging duplicates.",
      commentReply: "",
      aiPrompt: "",
      posts: JSON.stringify([]),
      active: true,
      userId: user.id,
      dmMode: "normal"
    }
  })
  
  console.log('✅ Created/updated TESTING automation:', testingAutomation.name)

  // Create additional useful automations
  const automations = [
    {
      name: "Welcome DM Response",
      triggerType: "dm", 
      actionType: "message",
      keywords: JSON.stringify(["hello", "hi", "hey"]),
      message: "Hi! Thanks for reaching out. How can I help you today?",
      commentReply: "",
      aiPrompt: "",
      posts: JSON.stringify([]),
      active: true,
      userId: user.id,
      dmMode: "normal"
    },
    {
      name: "Product Inquiry Response",
      triggerType: "comment",
      actionType: "message", 
      keywords: JSON.stringify(["price", "cost", "buy"]),
      message: "Thanks for your interest! I'll send you pricing details shortly.",
      commentReply: "",
      aiPrompt: "",
      posts: JSON.stringify([]),
      active: false,
      userId: user.id,
      dmMode: "normal"
    }
  ]

  for (const automation of automations) {
    const created = await prisma.automation.create({
      data: automation
    })
    console.log(`✅ Created automation: ${created.name}`)
  }

  console.log('🎉 Database seeded successfully!')
  console.log('📝 You can now test the duplicate fix by commenting "no" on an Instagram post')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
