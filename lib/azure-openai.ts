import { OpenAI } from "openai"
import { getEnv } from "./env-server"

export function getAzureOpenAI() {
  const env = getEnv()

  // Validate required Azure OpenAI environment variables
  if (!env.AZURE_OPENAI_API_KEY || !env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_DEPLOYMENT_NAME) {
    throw new Error("Azure OpenAI configuration missing - please set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT_NAME")
  }

  return new OpenAI({
    apiKey: env.AZURE_OPENAI_API_KEY,
    baseURL: `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
    defaultQuery: { "api-version": env.AZURE_OPENAI_API_VERSION || "2023-05-15" },
    defaultHeaders: { "api-key": env.AZURE_OPENAI_API_KEY },
  })
}

export async function generateAIResponse(prompt: string, fallbackMessage: string = "Thanks for reaching out!"): Promise<string> {
  try {
    const openai = getAzureOpenAI()
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant responding to Instagram messages and comments. Keep responses brief, friendly, and engaging. Respond in a conversational tone appropriate for social media."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4", // This will use your Azure deployment
      max_tokens: 200,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content?.trim()
    
    if (!response) {
      console.warn("AI response was empty, using fallback message")
      return fallbackMessage
    }
    
    return response
    
  } catch (error) {
    console.error("Error generating AI response:", error)
    return fallbackMessage
  }
}
