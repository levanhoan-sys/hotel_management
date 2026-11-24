import type { LucideIcon } from 'lucide-react'

export type StatTone = 'moss' | 'gold' | 'blue' | 'amber'

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'moss',
}: {
  label: string
  value: string | number
  detail?: string
  icon: LucideIcon
  tone?: StatTone
}) {
  return (
    <article className="hg-stat-card">
      <div className="hg-stat-top">
        <span className="hg-stat-label">{label}</span>
        <span className="hg-stat-icon" data-tone={tone} aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      </div>
      <strong className="hg-stat-value">{value}</strong>
      {detail && <small className="hg-stat-detail">{detail}</small>}
    </article>
  )
}
