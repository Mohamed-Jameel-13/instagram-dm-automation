import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const requestId = `cleanup_${Date.now()}`
  
  try {
    console.log(`🧹 [${requestId}] Starting duplicate automation cleanup...`)
    
    // Find duplicate automations (same triggerType and keywords for the same user)
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
    })
    
    // Group by user + trigger type + keywords
    const duplicateGroups = new Map()
    automations.forEach(auto => {
      const key = `${auto.userId}_${auto.triggerType}_${auto.keywords}`
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, [])
      }
      duplicateGroups.get(key).push(auto)
    })
    
    let disabledCount = 0
    const disabledAutomations = []
    
    // Disable older duplicates, keep the newest one
    for (const [key, group] of duplicateGroups.entries()) {
      if (group.length > 1) {
        // Sort by creation date (newest first)
        group.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        
        // Keep the first (newest), disable the rest
        const toDisable = group.slice(1)
        
        for (const automation of toDisable) {
          await prisma.automation.update({
            where: { id: automation.id },
            data: { active: false }
          })
          
          disabledCount++
          disabledAutomations.push({
            id: automation.id,
            name: automation.name,
            userId: automation.userId,
            createdAt: automation.createdAt
          })
          
          console.log(`🚫 [${requestId}] Disabled duplicate automation: ${automation.name} (${automation.id})`)
        }
      }
    }
    
    // Also check for any obvious test automations that might be causing issues
    const testAutomations = await prisma.automation.updateMany({
      where: {
        active: true,
        OR: [
          { name: { contains: "test", mode: "insensitive" } },
          { name: { contains: "untitled", mode: "insensitive" } },
          { keywords: { contains: "test" } }
        ]
      },
      data: { active: false }
    })
    
    disabledCount += testAutomations.count
    
    console.log(`🧹 [${requestId}] Cleanup completed: ${disabledCount} automations disabled`)
    
    // Get final active automation count
    const activeAutomations = await prisma.automation.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        userId: true,
        triggerType: true,
        keywords: true
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      disabledCount,
      disabledAutomations,
      disabledTestAutomations: testAutomations.count,
      remainingActiveAutomations: activeAutomations.length,
      activeAutomations: activeAutomations,
      recommendation: "Test commenting again - you should now receive only one response per automation"
    })
    
  } catch (error) {
    console.error(`❌ [${requestId}] Cleanup failed:`, error)
    return NextResponse.json(
      { error: "Cleanup failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 
