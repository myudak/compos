import { IconDeviceTablet, IconLogout, IconShieldLock } from "@tabler/icons-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { clearAuthSession, getOrCreateDeviceIdentity } from "@/lib/db"
import { useLiveQuery } from "dexie-react-hooks"

export function SettingsPage() {
  const device = useLiveQuery(() => getOrCreateDeviceIdentity(), [])
  async function logout() { await clearAuthSession(); window.location.reload() }
  return <div><PageHeader eyebrow="Registered device" title="Pengaturan perangkat" description="Identitas instalasi ini disimpan secara lokal dan terikat ke merchant." actions={<Button variant="outline" onClick={logout}><IconLogout /> Ganti operator</Button>} /><div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><IconDeviceTablet className="size-4 text-primary" /> Perangkat</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span>{device?.name ?? "Memuat…"}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Device ID</span><span className="break-all text-right font-mono text-[10px]">{device?.id ?? "Memuat…"}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-emerald-400">Terdaftar</span></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><IconShieldLock className="size-4 text-primary" /> Offline policy</CardTitle></CardHeader><CardContent className="text-xs leading-5 text-muted-foreground">Sesi checkout kritikal tetap tersedia tanpa jaringan. Otorisasi admin dan koreksi settled memerlukan koneksi serta audit trail.</CardContent></Card></div></div>
}
