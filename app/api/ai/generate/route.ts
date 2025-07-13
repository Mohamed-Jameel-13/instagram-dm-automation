import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { prompt, fallback, maxLength = 800 } = await req.json()

    // Generate AI response using Azure OpenAI
    const { getAzureOpenAI } = await import("@/lib/azure-openai")
    const openai = getAzureOpenAI()

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${prompt}\n\nCRITICAL: Keep responses under ${maxLength} characters. Be concise, direct, and helpful.`
        },
        {
          role: "user",
          content: "Generate a helpful response."
        }
      ],
      max_tokens: Math.min(120, Math.floor(maxLength / 6)), // Rough estimate: 6 chars per token
      temperature: 0.7,
    })

    let aiResponse = completion.choices[0]?.message?.content || fallback

    // Ensure response is under character limit
    if (aiResponse.length > maxLength) {
      aiResponse = aiResponse.substring(0, maxLength - 3) + "..."
    }

    console.log(`🤖 Generated AI response: ${aiResponse.length} chars`)

    return NextResponse.json({
      success: true,
      message: aiResponse,
      length: aiResponse.length
    })

  } catch (error) {
    console.error("Error generating AI response:", error)
    
    // Return fallback message on error
    const { fallback = "Thanks for reaching out!" } = await req.json()
    
    return NextResponse.json({
      success: false,
      message: fallback,
      error: "AI generation failed"
    })
  }
} 