import type { ReactNode } from 'react'

export function PageHeader({
  kicker,
  title,
  detail,
  action,
}: {
  kicker: string
  title: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <header className="hg-page-header">
      <div className="hg-page-header-copy">
        <span className="hg-kicker">{kicker}</span>
        <h2 className="hg-page-title">{title}</h2>
        {detail && <p className="hg-page-detail">{detail}</p>}
      </div>
      {action && <div className="hg-page-actions">{action}</div>}
    </header>
  )
}
