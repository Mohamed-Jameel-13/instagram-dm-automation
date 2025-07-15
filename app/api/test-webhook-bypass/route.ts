import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = 'edge'

async function processInstagramEvent(eventData: any) {
  console.log('🔄 Processing Instagram event:', JSON.stringify(eventData, null, 2))
  
  try {
    const entry = eventData.entry?.[0]
    if (!entry) {
      console.log('❌ No entry found in event data')
      return { success: false, error: 'No entry found' }
    }

    // Handle DM messages
    if (entry.messaging) {
      for (const message of entry.messaging) {
        console.log('📱 Processing DM message:', message)
        
        const recipientId = message.recipient?.id
        const senderId = message.sender?.id
        const messageText = message.message?.text?.toLowerCase()
        
        if (!recipientId || !senderId || !messageText) {
          console.log('❌ Missing required message data')
          continue
        }

        // Find automations for this Instagram account
        const automations = await db.automation.findMany({
          where: {
            instagramAccountId: recipientId,
            type: 'DM',
            isActive: true
          }
        })

        console.log(`🔍 Found ${automations.length} DM automations for account ${recipientId}`)

        for (const automation of automations) {
          const triggers = automation.triggers as string[]
          console.log(`🎯 Checking triggers: ${triggers.join(', ')} against message: "${messageText}"`)
          
          if (triggers.some(trigger => messageText.includes(trigger.toLowerCase()))) {
            console.log(`✅ Trigger matched! Automation: ${automation.name}`)
            
            // Log the automation trigger
            await db.automationLog.create({
              data: {
                automationId: automation.id,
                type: 'DM_RECEIVED',
                data: {
                  senderId,
                  messageText,
                  trigger: triggers.find(t => messageText.includes(t.toLowerCase()))
                }
              }
            })
            
            console.log('📝 Logged automation trigger')
            return { success: true, automation: automation.name, trigger: messageText }
          }
        }
      }
    }

    // Handle comment events
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          console.log('💬 Processing comment:', change.value)
          
          const commentText = change.value?.text?.toLowerCase()
          const postId = change.value?.media?.id
          const commenterId = change.value?.from?.id
          
          if (!commentText || !postId || !commenterId) {
            console.log('❌ Missing required comment data')
            continue
          }

          // Find automations for comments
          const automations = await db.automation.findMany({
            where: {
              type: 'COMMENT',
              isActive: true
            }
          })

          console.log(`🔍 Found ${automations.length} comment automations`)

          for (const automation of automations) {
            const triggers = automation.triggers as string[]
            console.log(`🎯 Checking triggers: ${triggers.join(', ')} against comment: "${commentText}"`)
            
            if (triggers.some(trigger => commentText.includes(trigger.toLowerCase()))) {
              console.log(`✅ Comment trigger matched! Automation: ${automation.name}`)
              
              // Log the automation trigger
              await db.automationLog.create({
                data: {
                  automationId: automation.id,
                  type: 'COMMENT_RECEIVED',
                  data: {
                    commenterId,
                    commentText,
                    postId,
                    trigger: triggers.find(t => commentText.includes(t.toLowerCase()))
                  }
                }
              })
              
              console.log('📝 Logged comment automation trigger')
              return { success: true, automation: automation.name, trigger: commentText }
            }
          }
        }
      }
    }

    console.log('❌ No matching automations found')
    return { success: false, error: 'No matching automations' }
  } catch (error) {
    console.error('❌ Error processing event:', error)
    return { success: false, error: error.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    console.log('📥 Received test webhook (bypassing signature):', body)
    
    const eventData = JSON.parse(body)
    
    // Process the event
    const result = await processInstagramEvent(eventData)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event processed',
      result 
    })
  } catch (error) {
    console.error('❌ Webhook processing failed:', error)
    return NextResponse.json({ 
      error: 'Processing failed', 
      details: error.message 
    }, { status: 500 })
  }
} 