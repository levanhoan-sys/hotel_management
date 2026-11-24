import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

export function DataTableShell({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm…',
  searchAriaLabel,
  filters,
  resultCountLabel,
  children,
}: {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  searchAriaLabel?: string
  filters?: ReactNode
  resultCountLabel?: string
  children: ReactNode
}) {
  const hasToolbar = onSearchChange !== undefined || Boolean(filters) || Boolean(resultCountLabel)

  return (
    <section className="hg-table-shell">
      {hasToolbar && (
        <div className="hg-table-toolbar">
          {onSearchChange !== undefined && (
            <label className="hg-table-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={searchValue ?? ''}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchAriaLabel ?? searchPlaceholder}
              />
            </label>
          )}
          {filters && <div className="hg-table-filters">{filters}</div>}
          {resultCountLabel && <span className="hg-table-count">{resultCountLabel}</span>}
        </div>
      )}
      <div className="hg-table-scroll">{children}</div>
    </section>
  )
}
