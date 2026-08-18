export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">K</span>
      <strong>K-POS</strong>
      <small>OWNER</small>
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Panel({
  title,
  copy,
  action,
  children,
}: {
  title: string
  copy?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="panel">
      <header>
        <div>
          <h2>{title}</h2>
          {copy && <p>{copy}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>Tutup</button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function Status({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "neutral" | "good" | "warn" | "bad"
}) {
  return <span className={`status ${tone}`}>{children}</span>
}
