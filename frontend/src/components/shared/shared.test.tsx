import { describe, expect, it, vi } from 'vitest'
import { BedDouble } from 'lucide-react'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  ConfirmDialog,
  DataTableShell,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatCard,
  StatusBadge,
} from './index'

describe('Shared design system components', () => {
  it('renders PageHeader, StatCard, and StatusBadge with semantic tones', () => {
    render(
      <div>
        <PageHeader kicker="QUẢN LÝ" title="Đặt phòng" detail="Danh sách đặt phòng hiện tại." />
        <StatCard label="Tổng số phòng" value={24} detail="18 phòng sẵn sàng" icon={BedDouble} tone="moss" />
        <StatusBadge status="CONFIRMED" />
        <StatusBadge status="PENDING_VERIFICATION" />
        <StatusBadge status="MAINTENANCE" />
      </div>,
    )

    expect(screen.getByText('QUẢN LÝ')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đặt phòng' })).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
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

  it('handles ConfirmDialog confirm and DataTableShell search', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    const onSearchChange = vi.fn()

    render(
      <div>
        <DataTableShell
          searchValue=""
          onSearchChange={onSearchChange}
          searchPlaceholder="Tìm mã đặt phòng…"
          resultCountLabel="5 kết quả"
        >
          <div>Nội dung bảng</div>
        </DataTableShell>
        <ConfirmDialog
          open
          onOpenChange={onOpenChange}
          title="Xác nhận hủy đơn"
          message="Bạn có chắc chắn muốn hủy đơn đặt phòng này?"
          confirmLabel="Đồng ý hủy"
          tone="danger"
          onConfirm={onConfirm}
        />
      </div>,
    )

    fireEvent.change(screen.getByPlaceholderText('Tìm mã đặt phòng…'), { target: { value: 'HG-101' } })
    expect(onSearchChange).toHaveBeenCalledWith('HG-101')
    expect(screen.getByText('5 kết quả')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý hủy' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
