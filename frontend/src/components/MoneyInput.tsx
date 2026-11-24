import { useLayoutEffect, useRef, type InputHTMLAttributes } from 'react'

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
}

const groupThousands = (value: string) => value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  const input = useRef<HTMLInputElement>(null)
  const caretDigits = useRef<number | null>(null)
  const formatted = groupThousands(value)
  useLayoutEffect(() => {
    const target = input.current
    if (!target || caretDigits.current === null) return
    const digits = caretDigits.current
    let position = 0
    let seen = 0
    while (position < formatted.length && seen < digits) {
      if (/\d/.test(formatted[position])) seen += 1
      position += 1
    }
    target.setSelectionRange(position, position)
    caretDigits.current = null
  }, [formatted])
  return <input {...props} ref={input} type="text" inputMode="numeric" value={formatted} onChange={event => {
    const cursor = event.currentTarget.selectionStart ?? event.currentTarget.value.length
    caretDigits.current = event.currentTarget.value.slice(0, cursor).replace(/\D/g, '').length
    onChange(event.currentTarget.value.replace(/\D/g, ''))
  }} />
}
