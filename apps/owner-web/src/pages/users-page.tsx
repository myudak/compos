import type { ManagedUserDto } from "@k-pos/api-client"
import { IconKey, IconPlus, IconUserCheck, IconUserOff } from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"

import { ownerApi, type OwnerSession } from "../api"
import { Modal, Panel, Status } from "../ui"

export function UsersPage({ session, refreshKey }: { session: OwnerSession; refreshKey: number }) {
  const [users, setUsers] = useState<ManagedUserDto[]>([])
  const [creating, setCreating] = useState(false)
  const [passwordFor, setPasswordFor] = useState<ManagedUserDto | null>(null)
  const [error, setError] = useState("")
  const refresh = useCallback(
    () =>
      ownerApi
        .users(session)
        .then(setUsers)
        .catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : "User gagal dimuat"),
        ),
    [session],
  )
  useEffect(() => void refresh(), [refresh, refreshKey])
  async function toggle(user: ManagedUserDto) {
    try {
      await ownerApi.setUserActive(session, user.id_user, !user.is_active)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status user gagal diubah")
    }
  }
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Tim merchant</h1>
          <p>Owner membuat Entry atau Operator. Tidak ada public signup.</p>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <Panel
        title="Akun dan akses"
        copy={`${users.length} akun merchant`}
        action={
          <button className="primary small" onClick={() => setCreating(true)}>
            <IconPlus /> Tambah akun
          </button>
        }
      >
        <div className="table-list">
          {users.map((user) => (
            <div className="table-row" key={user.id_user}>
              <span className="avatar">{user.full_name.slice(0, 1)}</span>
              <span className="grow">
                <strong>{user.full_name}</strong>
                <small>{user.email}</small>
              </span>
              <Status tone={user.role === "OWNER" ? "warn" : "neutral"}>{user.role}</Status>
              <Status tone={user.is_active ? "good" : "bad"}>
                {user.is_active ? "Aktif" : "Nonaktif"}
              </Status>
              {user.role !== "OWNER" && (
                <div className="row-actions">
                  <button onClick={() => setPasswordFor(user)}>
                    <IconKey /> Password
                  </button>
                  <button onClick={() => void toggle(user)}>
                    {user.is_active ? <IconUserOff /> : <IconUserCheck />}
                    {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
      {creating && (
        <CreateUser
          session={session}
          onClose={() => setCreating(false)}
          onSaved={() => (setCreating(false), void refresh())}
        />
      )}
      {passwordFor && (
        <ChangePassword session={session} user={passwordFor} onClose={() => setPasswordFor(null)} />
      )}
    </div>
  )
}

function CreateUser({
  session,
  onClose,
  onSaved,
}: {
  session: OwnerSession
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"OPERATOR" | "ENTRY">("OPERATOR")
  const [error, setError] = useState("")
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await ownerApi.createUser(session, { full_name: fullName, email, password, role })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "User gagal dibuat")
    }
  }
  return (
    <Modal title="Tambah akun" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>
          <span>Nama lengkap</span>
          <input required value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option value="OPERATOR">Operator</option>
            <option value="ENTRY">Entry</option>
          </select>
        </label>
        <label>
          <span>Password awal</span>
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary">Buat akun</button>
      </form>
    </Modal>
  )
}

function ChangePassword({
  session,
  user,
  onClose,
}: {
  session: OwnerSession
  user: ManagedUserDto
  onClose: () => void
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await ownerApi.changePassword(session, user.id_user, password)
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password gagal diubah")
    }
  }
  return (
    <Modal title={`Reset password · ${user.full_name}`} onClose={onClose}>
      {done ? (
        <div className="success-box">
          Password berubah dan semua session akun ini sudah dicabut.
        </div>
      ) : (
        <form className="modal-form" onSubmit={submit}>
          <label>
            <span>Password baru</span>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary">Reset password</button>
        </form>
      )}
    </Modal>
  )
}
