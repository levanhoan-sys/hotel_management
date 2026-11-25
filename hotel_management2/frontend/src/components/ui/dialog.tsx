import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { PropsWithChildren, ReactNode } from 'react'

export function Dialog({ open, onOpenChange, title, children }: PropsWithChildren<{ open: boolean; onOpenChange: (open: boolean) => void; title: string }>) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="modal-backdrop" />
      <DialogPrimitive.Content className="modal" aria-describedby={undefined}>
        <div className="modal-head"><DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title><DialogPrimitive.Close className="icon-action" aria-label="Đóng">×</DialogPrimitive.Close></div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}

export function DialogTrigger({ children }: { children: ReactNode }) { return <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger> }
