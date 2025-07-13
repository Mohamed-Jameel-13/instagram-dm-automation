import { OpenAI } from "openai"
import { getEnv } from "./env-server"

export function getAzureOpenAI() {
  const env = getEnv()

  return new OpenAI({
    apiKey: env.AZURE_OPENAI_API_KEY,
    baseURL: `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
    defaultQuery: { "api-version": env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { "api-key": env.AZURE_OPENAI_API_KEY },
  })
}
