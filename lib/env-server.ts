import { validateEnv } from "./env"

// This should only be imported in server components or API routes
export function getEnv() {
  return validateEnv()
}
