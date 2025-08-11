import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const requestId = `fix_account_${Date.now()}`
  
  try {
    console.log(`🔧 [${requestId}] Fixing Instagram account mismatch...`)
    
    // Get the test user
    const testUser = await prisma.user.findFirst({
      where: {
        email: "test@example.com"
      }
    })
    
    if (!testUser) {
      return NextResponse.json({
        success: false,
        error: "Test user not found - database needs seeding"
      }, { status: 404 })
    }
    
    console.log(`👤 [${requestId}] Found test user: ${testUser.id}`)
    
    // The correct Instagram business account ID from environment
    const correctInstagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "24695355950081100"
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
    
    if (!accessToken) {
      return NextResponse.json({
        success: false, 
        error: "INSTAGRAM_ACCESS_TOKEN not found in environment variables"
      }, { status: 500 })
    }
    
    // Check if Instagram account exists
    let instagramAccount = await prisma.account.findFirst({
      where: {
        userId: testUser.id,
        provider: "instagram"
      }
    })
    
    if (!instagramAccount) {
      // Create the missing Instagram account connection
      instagramAccount = await prisma.account.create({
        data: {
          userId: testUser.id,
          type: "oauth",
          provider: "instagram",
          providerAccountId: correctInstagramAccountId,
          access_token: accessToken,
          scope: "instagram_basic,instagram_manage_comments,instagram_manage_messages",
          token_type: "bearer"
        }
      })
      
      console.log(`✅ [${requestId}] Created Instagram account connection: ${correctInstagramAccountId}`)
    } else {
      // Update existing account to ensure correct data
      instagramAccount = await prisma.account.update({
        where: { id: instagramAccount.id },
        data: {
          providerAccountId: correctInstagramAccountId,
          access_token: accessToken,
          scope: "instagram_basic,instagram_manage_comments,instagram_manage_messages"
        }
      })
      
      console.log(`✅ [${requestId}] Updated Instagram account: ${instagramAccount.providerAccountId} → ${correctInstagramAccountId}`)
    }
    
    // Activate the test automation
    const updatedAutomations = await prisma.automation.updateMany({
      where: {
        userId: testUser.id
      },
      data: {
        active: true
      }
    })
    
    console.log(`✅ [${requestId}] Activated ${updatedAutomations.count} automations`)
    
    return NextResponse.json({
      success: true,
      message: "Account mismatch fixed - your automations should now work!",
      data: {
        userId: testUser.id,
        instagramAccountId: correctInstagramAccountId,
        hasAccessToken: !!accessToken,
        automationsActivated: updatedAutomations.count
      },
      testInstructions: {
        step1: "Comment 'no' on any of your Instagram posts",
        step2: "You should receive a DM response (not duplicated!)",
        step3: "Check Vercel logs to see processing details"
      }
    })
    
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to fix account mismatch:`, error)
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fix account mismatch", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 