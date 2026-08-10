import { IconDeviceTablet, IconShieldLock } from "@tabler/icons-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DEVICE_ID } from "@/lib/db"

export function SettingsPage() {
  return <div><PageHeader eyebrow="Registered device" title="Pengaturan perangkat" description="Identitas instalasi ini disimpan secara lokal dan terikat ke merchant." /><div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><IconDeviceTablet className="size-4 text-primary" /> Perangkat</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span>Counter Blok M 04</span></div><div className="flex justify-between"><span className="text-muted-foreground">Device ID</span><span className="font-mono text-[10px]">{DEVICE_ID}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-emerald-400">Terdaftar</span></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><IconShieldLock className="size-4 text-primary" /> Offline policy</CardTitle></CardHeader><CardContent className="text-xs leading-5 text-muted-foreground">Sesi checkout kritikal tetap tersedia tanpa jaringan. Otorisasi admin dan koreksi settled memerlukan koneksi serta audit trail.</CardContent></Card></div></div>
}
