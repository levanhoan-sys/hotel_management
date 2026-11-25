import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
} from './index'

describe('Shared design system components', () => {
  it('renders StatusBadge with semantic tones', () => {
    render(
      <div>
        <StatusBadge status="CONFIRMED" />
        <StatusBadge status="PENDING_VERIFICATION" />
        <StatusBadge status="MAINTENANCE" />
      </div>,
    )

    expect(screen.getByText('Đã xác nhận')).toBeInTheDocument()
    expect(screen.getByText('Chờ xác minh cọc')).toBeInTheDocument()
    expect(screen.getByText('Bảo trì')).toBeInTheDocument()
  })

  it('renders LoadingSkeleton, ErrorState retry, and EmptyState', () => {
    const retry = vi.fn()
    render(
      <div>
        <LoadingSkeleton variant="rows" count={2} />
        <ErrorState error={new Error('Network Error')} retry={retry} />
        <EmptyState title="Chưa có dữ liệu" detail="Vui lòng thử lại sau." />
      </div>,
    )

    expect(screen.getByLabelText('Đang tải dữ liệu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /thử lại/i }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument()
  })

  it('handles ConfirmDialog confirm', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Xác nhận hủy đơn"
        message="Bạn có chắc chắn muốn hủy đơn đặt phòng này?"
        confirmLabel="Đồng ý hủy"
        tone="danger"
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý hủy' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
