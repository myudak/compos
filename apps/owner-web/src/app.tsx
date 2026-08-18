import { useState } from "react"

import { storedSession, type OwnerSession } from "./api"
import { LoginPage } from "./login-page"
import { OwnerWorkspace } from "./owner-workspace"

export function App() {
  const [session, setSession] = useState<OwnerSession | null>(() => storedSession())
  return session ? (
    <OwnerWorkspace session={session} onSessionEnd={() => setSession(null)} />
  ) : (
    <LoginPage onLogin={setSession} />
  )
}
