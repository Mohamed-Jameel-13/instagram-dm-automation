"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getEnv } from "@/lib/env-server"
import { OpenAI } from "openai"

const automationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  active: z.boolean().default(false),
  triggerType: z.enum(["comment", "dm", "follow_comment"]),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  actionType: z.enum(["message", "ai"]),
  message: z.string().optional(),
  commentReply: z.string().optional(),
  aiPrompt: z.string().optional(),
  posts: z.array(z.string()).optional(),
})

export async function createAutomation(formData: FormData) {
  const userId = "firebase-user-id" // TODO: Implement Firebase Auth

  if (!null // TODO: Implement Firebase Auth) {
    return { error: "Unauthorized" }
  }

  const rawData = {
    name: formData.get("name") as string,
    active: formData.get("active") === "true",
    triggerType: formData.get("triggerType") as string,
    keywords: JSON.parse(formData.get("keywords") as string),
    actionType: formData.get("actionType") as string,
    message: formData.get("message") as string,
    commentReply: formData.get("commentReply") as string,
    aiPrompt: formData.get("aiPrompt") as string,
    posts: JSON.parse((formData.get("posts") as string) || "[]"),
  }

  try {
    const data = automationSchema.parse(rawData)

    const automation = await prisma.automation.create({
      data: {
        ...data,
        userId: userId,
      },
    })

    revalidatePath("/automations")
    return { success: true, automation }
  } catch (error) {
    return { error: error.message || "Failed to create automation" }
  }
}

export async function updateAutomation(formData: FormData) {
  const userId = "firebase-user-id" // TODO: Implement Firebase Auth

  if (!null // TODO: Implement Firebase Auth) {
    return { error: "Unauthorized" }
  }

  const id = formData.get("id") as string

  if (!id) {
    return { error: "Automation ID is required" }
  }

  const rawData = {
    id,
    name: formData.get("name") as string,
    active: formData.get("active") === "true",
    triggerType: formData.get("triggerType") as string,
    keywords: JSON.parse(formData.get("keywords") as string),
    actionType: formData.get("actionType") as string,
    message: formData.get("message") as string,
    commentReply: formData.get("commentReply") as string,
    aiPrompt: formData.get("aiPrompt") as string,
    posts: JSON.parse((formData.get("posts") as string) || "[]"),
  }

  try {
    const data = automationSchema.parse(rawData)

    const automation = await prisma.automation.update({
      where: { id, userId: userId },
      data,
    })

    revalidatePath(`/automations/${id}`)
    revalidatePath("/automations")
    return { success: true, automation }
  } catch (error) {
    return { error: error.message || "Failed to update automation" }
  }
}

export async function deleteAutomation(id: string) {
  const userId = "firebase-user-id" // TODO: Implement Firebase Auth

  if (!null // TODO: Implement Firebase Auth) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.automation.delete({
      where: { id, userId: userId },
    })

    revalidatePath("/automations")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete automation" }
  }
}

export async function generateAIResponse(prompt: string, userMessage: string) {
  const env = getEnv()

  // Configure OpenAI with Azure OpenAI settings
  const openai = new OpenAI({
    apiKey: env.AZURE_OPENAI_API_KEY,
    baseURL: `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
    defaultQuery: { "api-version": env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { "api-key": env.AZURE_OPENAI_API_KEY },
  })

  try {
    const response = await openai.chat.completions.create({
      model: env.AZURE_OPENAI_DEPLOYMENT_NAME, // Use deployment name as the model
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 500,
    })

    return {
      success: true,
      response: response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.",
    }
  } catch (error) {
    console.error("AI response generation error:", error)
    return { error: "Failed to generate AI response" }
  }
}
