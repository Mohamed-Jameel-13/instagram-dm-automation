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
