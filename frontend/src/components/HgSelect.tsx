import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type HgSelectOption = {
  value: string
  label: string
  hint?: string
}

type HgSelectProps = {
  options: HgSelectOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  panelTitle?: string
  placeholder?: string
  variant?: 'search-cell' | 'filter' | 'field' | 'inline'
  align?: 'left' | 'right'
  disabled?: boolean
  className?: string
}

export function HgSelect({
  options,
  value,
  onChange,
  ariaLabel,
  panelTitle,
  placeholder = 'Chọn một mục',
  variant = 'filter',
  align = 'left',
  disabled = false,
  className = '',
}: HgSelectProps) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom')
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selectedIndex = options.findIndex((opt) => opt.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null
  const heading = panelTitle ?? (variant === 'inline' ? undefined : ariaLabel)

  const updateMenuPosition = () => {
    const rootEl = rootRef.current
    if (!rootEl) return

    const cellEl = variant === 'search-cell' ? rootEl.closest('.hg-search-cell') : null
    const anchorRect = (cellEl ?? rootEl).getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const scrollX = window.scrollX || window.pageXOffset || 0
    const scrollY = window.scrollY || window.pageYOffset || 0
    const margin = 12

    const minDesired =
      variant === 'search-cell'
        ? Math.max(anchorRect.width, 224)
        : variant === 'inline'
          ? Math.max(anchorRect.width, 168)
          : Math.max(anchorRect.width, 224)
    const width = Math.min(Math.max(minDesired, anchorRect.width), 340, viewportW - margin * 2)

    const estimatedRowsHeight = Math.min(options.length, 6) * 42 + (heading ? 36 : 14)
    const docSpaceBelow = document.documentElement.scrollHeight - (anchorRect.bottom + scrollY) - margin
    const spaceBelow = viewportH - anchorRect.bottom - margin
    const spaceAbove = anchorRect.top - margin

    // Always open downward for search bar cells and whenever there is page room below
    const openUpward =
      variant !== 'search-cell' &&
      docSpaceBelow < estimatedRowsHeight &&
      spaceBelow < Math.min(estimatedRowsHeight, 200) &&
      spaceAbove > spaceBelow

    let left = align === 'right' ? anchorRect.right - width : anchorRect.left
    left = Math.max(margin, Math.min(left, viewportW - width - margin))

    setPlacement(openUpward ? 'top' : 'bottom')
    setMenuStyle(
      openUpward
        ? {
            position: 'absolute',
            left: `${left + scrollX}px`,
            top: `${Math.max(margin, anchorRect.top + scrollY - estimatedRowsHeight - 8)}px`,
            width: `${width}px`,
            zIndex: 2000,
          }
        : {
            position: 'absolute',
            left: `${left + scrollX}px`,
            top: `${anchorRect.bottom + scrollY + 8}px`,
            width: `${width}px`,
            zIndex: 2000,
          },
    )
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, options.length, align, variant])

  useEffect(() => {
    if (!open || placement !== 'bottom') return
    const frame = window.requestAnimationFrame(() => {
      const menuEl = menuRef.current
      if (!menuEl) return
      const rect = menuEl.getBoundingClientRect()
      const overflow = rect.bottom - (window.innerHeight - 16)
      if (overflow > 0 && typeof window.scrollBy === 'function') {
        window.scrollBy({ top: Math.min(overflow + 12, 260), behavior: 'smooth' })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, placement])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const handleReposition = () => updateMenuPosition()

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleReposition)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleReposition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [open, selectedIndex])

  const commit = (option: HgSelectOption) => {
    onChange(option.value)
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightedIndex((prev) => (prev + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length)
    } else if (event.key === 'Home' && open) {
      event.preventDefault()
      setHighlightedIndex(0)
    } else if (event.key === 'End' && open) {
      event.preventDefault()
      setHighlightedIndex(options.length - 1)
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault()
      const idx = highlightedIndex >= 0 ? highlightedIndex : selectedIndex >= 0 ? selectedIndex : 0
      const target = options[idx]
      if (target) commit(target)
    }
  }

  const menuPanel =
    open && (
      <div
        id={listboxId}
        ref={menuRef}
        role="listbox"
        aria-label={ariaLabel}
        style={menuStyle}
        className={`hg-select-portal-menu is-placement-${placement} is-align-${align} is-variant-${variant}`.trim()}
      >
        {heading && (
          <div className="hg-select-portal-head">
            <span>{heading}</span>
          </div>
        )}
        <div className="hg-select-menu-inner">
          {options.map((option, idx) => {
            const isSelected = option.value === value
            const isHighlighted = idx === highlightedIndex
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`hg-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`.trim()}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => commit(option)}
              >
                <span className="hg-select-option-text">
                  <b>{option.label}</b>
                  {option.hint && <small>{option.hint}</small>}
                </span>
                {isSelected && <Check size={15} className="hg-select-check" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    )

  return (
    <div
      ref={rootRef}
      className={`hg-select is-${variant} is-align-${align} ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        className="hg-select-trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className={`hg-select-value ${!selectedOption ? 'is-placeholder' : ''}`.trim()}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={15} className="hg-select-chevron" aria-hidden="true" />
      </button>

      {menuPanel && typeof document !== 'undefined' ? createPortal(menuPanel, document.body) : menuPanel}
    </div>
  )
}
