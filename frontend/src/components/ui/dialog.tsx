import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'

type DialogSize = 'sm' | 'md' | 'lg'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
}: PropsWithChildren<{
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: DialogSize
}>) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-backdrop" />
        <DialogPrimitive.Content
          className="modal hg-dialog"
          data-size={size}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="modal-head">
            <div>
              <DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="hg-dialog-desc">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="hg-dialog-close" aria-label="Đóng">
              <X size={18} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function DialogTrigger({ children }: { children: ReactNode }) {
  return <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
}
