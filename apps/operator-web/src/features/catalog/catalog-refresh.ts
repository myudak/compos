import { bootstrapLocalData } from "@/features/auth/auth-api"
import {
  getAuthSession,
  isOnlineSessionValid,
} from "@/infrastructure/persistence/session-repository"

export async function refreshActiveCatalog() {
  const session = await getAuthSession()
  if (!session || !isOnlineSessionValid(session)) return false
  await bootstrapLocalData(session)
  return true
}
