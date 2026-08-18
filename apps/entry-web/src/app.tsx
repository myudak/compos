import { useState } from "react"

import { storedEntrySession, type EntrySession } from "./api"
import { EntryWorkspace } from "./entry-workspace"
import { LoginPage } from "./login-page"

export function App() {
  const [session, setSession] = useState<EntrySession | null>(() => storedEntrySession())
  return session ? (
    <EntryWorkspace session={session} onSessionEnd={() => setSession(null)} />
  ) : (
    <LoginPage onLogin={setSession} />
  )
}
