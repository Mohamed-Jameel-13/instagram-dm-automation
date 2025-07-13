const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Find the first user
  const user = await prisma.user.findFirst()
  
  if (!user) {
    console.log('No user found. Please sign up first.')
    return
  }

  console.log('Found user:', user.email)

  // Create sample automations
  const automations = [
    {
      name: "Instagram DM Auto Reply",
      triggerType: "dm",
      actionType: "message",
      keywords: JSON.stringify(["hello", "hi", "support"]),
      message: "Thanks for reaching out! We'll get back to you soon.",
      commentReply: "",
      aiPrompt: "",
      posts: JSON.stringify([]),
      active: true,
      userId: user.id
    },
    {
      name: "Comment Auto Response",
      triggerType: "comment",
      actionType: "comment",
      keywords: JSON.stringify(["product", "price", "info"]),
      message: "",
      commentReply: "Thanks for your interest! Check out our website for more details.",
      aiPrompt: "",
      posts: JSON.stringify([]),
      active: false,
      userId: user.id
    },
    {
      name: "AI-Powered Support",
      triggerType: "dm",
      actionType: "ai",
      keywords: JSON.stringify(["help", "question", "issue"]),
      message: "",
      commentReply: "",
      aiPrompt: "You are a helpful customer support assistant. Respond to user inquiries professionally and helpfully.",
      posts: JSON.stringify([]),
      active: true,
      userId: user.id
    }
  ]

  for (const automation of automations) {
    const created = await prisma.automation.create({
      data: automation
    })
    console.log(`Created automation: ${created.name}`)
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
