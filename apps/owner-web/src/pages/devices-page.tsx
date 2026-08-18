import type { DeviceDto } from "@k-pos/api-client"
import { IconDeviceTablet, IconPlus, IconUnlink } from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"

import { ownerApi, type OwnerSession } from "../api"
import { Modal, Panel, Status } from "../ui"

export function DevicesPage({
  session,
  refreshKey,
}: {
  session: OwnerSession
  refreshKey: number
}) {
  const [devices, setDevices] = useState<DeviceDto[]>([])
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<DeviceDto | null>(null)
  const [error, setError] = useState("")
  const refresh = useCallback(
    () =>
      ownerApi
        .devices(session)
        .then(setDevices)
        .catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : "Device gagal dimuat"),
        ),
    [session],
  )
  useEffect(() => void refresh(), [refresh, refreshKey])
  async function revoke(device: DeviceDto) {
    if (!confirm(`Cabut ${device.name}? Queued sale tetap disimpan pada device.`)) return
    try {
      await ownerApi.revokeDevice(session, device.id_device)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Device gagal dicabut")
    }
  }
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Counter devices</h1>
          <p>Device adalah shared merchant counter, bukan milik permanen satu user.</p>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <Panel
        title="Device registry"
        copy={`${devices.length} counter terdaftar`}
        action={
          <button className="primary small" onClick={() => setCreating(true)}>
            <IconPlus /> Device baru
          </button>
        }
      >
        <div className="device-grid">
          {devices.map((device) => (
            <article key={device.id_device}>
              <i>
                <IconDeviceTablet />
              </i>
              <div>
                <h3>{device.name}</h3>
                <code>{device.id_device}</code>
              </div>
              <Status
                tone={
                  device.status === "PAIRED" ? "good" : device.status === "REVOKED" ? "bad" : "warn"
                }
              >
                {device.status}
              </Status>
              {device.pairing_code && (
                <div className="pair-code">
                  <span>Pairing code</span>
                  <strong>{device.pairing_code}</strong>
                  <small>
                    Expired{" "}
                    {device.pairing_expires_at
                      ? new Date(device.pairing_expires_at).toLocaleTimeString("id-ID")
                      : "—"}
                  </small>
                </div>
              )}
              <dl>
                <div>
                  <dt>Last online</dt>
                  <dd>
                    {device.last_online_at
                      ? new Date(device.last_online_at).toLocaleString("id-ID")
                      : "Belum pernah"}
                  </dd>
                </div>
                <div>
                  <dt>Last sync</dt>
                  <dd>
                    {device.last_sync_at
                      ? new Date(device.last_sync_at).toLocaleString("id-ID")
                      : "Belum pernah"}
                  </dd>
                </div>
              </dl>
              {device.status !== "REVOKED" && (
                <button className="danger-button" onClick={() => void revoke(device)}>
                  <IconUnlink /> Cabut device
                </button>
              )}
            </article>
          ))}
        </div>
      </Panel>
      {creating && (
        <CreateDevice
          session={session}
          onClose={() => setCreating(false)}
          onCreated={(device) => (setCreating(false), setCreated(device), void refresh())}
        />
      )}
      {created && (
        <Modal title="Pairing code siap" onClose={() => setCreated(null)}>
          <div className="pairing-result">
            <p>Masukkan kode ini di Operator device. Kode berlaku 10 menit.</p>
            <strong>{created.pairing_code}</strong>
            <code>{created.id_device}</code>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CreateDevice({
  session,
  onClose,
  onCreated,
}: {
  session: OwnerSession
  onClose: () => void
  onCreated: (device: DeviceDto) => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      onCreated(await ownerApi.createDevice(session, name))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Device gagal dibuat")
    }
  }
  return (
    <Modal title="Daftarkan counter" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>
          <span>Nama device</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tablet Kasir Depan"
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary">Buat pairing code</button>
      </form>
    </Modal>
  )
}
