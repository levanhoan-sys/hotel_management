import type { Booking, Invoice } from './types'

const formatMoney = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(parsed)
}

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const invoiceStatusLabel = (status: Invoice['status']) =>
  status === 'PAID' ? 'Đã thanh toán' : status === 'ISSUED' ? 'Đã phát hành' : 'Bản nháp'

export function localizeInvoiceItemDescription(description: string): string {
  const trimmed = description.trim()
  const roomMatch = /^Room\s+(\S+)\s+for\s+(\d+)\s+night\(s\)$/i.exec(trimmed)
  if (roomMatch) {
    return `Phòng ${roomMatch[1]} (${roomMatch[2]} đêm)`
  }
  if (/^Tax\s*\(10%\)$/i.test(trimmed)) return 'Thuế VAT (10%)'
  if (/^Tax$/i.test(trimmed)) return 'Thuế VAT'
  if (/^Surcharge$/i.test(trimmed)) return 'Phụ thu'
  if (/^Discount$/i.test(trimmed)) return 'Giảm giá'
  return trimmed.replace(/\s*-\s*room\s+(\S+)$/i, ' — Phòng $1')
}

export function buildPrintableInvoiceHtml(invoice: Invoice, booking?: Booking | null): string {
  const code = booking?.bookingCode || `#${invoice.bookingId}`
  const statusText = invoiceStatusLabel(invoice.status)
  const roomsText = booking?.roomNumbers?.length ? booking.roomNumbers.map((r) => `Phòng ${r}`).join(', ') : '—'

  const itemRows = (invoice.items || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(localizeInvoiceItemDescription(item.description))}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${escapeHtml(formatMoney(item.unitPrice))}</td>
          <td class="num"><strong>${escapeHtml(formatMoney(item.lineTotal))}</strong></td>
        </tr>
      `,
    )
    .join('')

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hóa đơn #HG-${invoice.id} — ${escapeHtml(code)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 20px;
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f7f3eb;
      color: #1d241f;
      line-height: 1.5;
    }
    .sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e3ddd0;
      border-radius: 14px;
      padding: 32px;
      box-shadow: 0 12px 32px rgba(23, 61, 43, 0.08);
    }
    .toolbar {
      max-width: 780px;
      margin: 0 auto 14px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn {
      border: 1px solid #173d2b;
      background: #173d2b;
      color: #fff;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e7e1d4;
    }
    .kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #9b7433;
    }
    h1 {
      margin: 4px 0 4px;
      font-size: 24px;
      color: #173d2b;
    }
    .muted { color: #5b665f; font-size: 13.5px; margin: 0; }
    .badge {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      background: #edf3ef;
      color: #173d2b;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 20px;
      margin: 20px 0;
      padding: 16px;
      border-radius: 10px;
      background: #fbf9f5;
      border: 1px solid #ebe5d9;
    }
    .meta span { display: block; font-size: 11px; font-weight: 700; color: #67726b; text-transform: uppercase; }
    .meta b { font-size: 14px; color: #1d241f; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0 20px; }
    th, td { padding: 11px 10px; border-bottom: 1px solid #ece7dc; text-align: left; font-size: 13.5px; }
    th { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.06em; color: #5b665f; background: #fbf9f5; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .summary {
      margin-left: auto;
      max-width: 340px;
      display: grid;
      gap: 8px;
      font-size: 14px;
    }
    .summary-row { display: flex; justify-content: space-between; gap: 16px; }
    .summary-total {
      border-top: 2px solid #173d2b;
      padding-top: 10px;
      margin-top: 4px;
      font-size: 17px;
      font-weight: 700;
      color: #173d2b;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet { box-shadow: none; border: 0; padding: 16px 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" type="button" onclick="window.print()">In / Lưu PDF</button>
  </div>
  <main class="sheet">
    <header class="head">
      <div>
        <div class="kicker">HOÀNG GIA HOTEL · HÓA ĐƠN THANH TOÁN</div>
        <h1>Hóa đơn #HG-${invoice.id}</h1>
        <p class="muted">Khách hàng: <strong>${escapeHtml(invoice.customerName)}</strong> · Mã đơn: <strong>${escapeHtml(code)}</strong></p>
      </div>
      <span class="badge">${escapeHtml(statusText)}</span>
    </header>

    <section class="meta">
      <div><span>Phòng lưu trú</span><b>${escapeHtml(roomsText)}</b></div>
      <div><span>Ngày nhận — trả dự kiến</span><b>${escapeHtml(formatDate(booking?.checkInDate))} → ${escapeHtml(formatDate(booking?.checkOutDate))}</b></div>
      <div><span>Check-in thực tế</span><b>${escapeHtml(formatDateTime(booking?.checkedInAt))}</b></div>
      <div><span>Check-out / Thanh toán</span><b>${escapeHtml(formatDateTime(booking?.checkedOutAt || invoice.paidAt))}</b></div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Khoản mục</th>
          <th class="num">SL</th>
          <th class="num">Đơn giá</th>
          <th class="num">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || '<tr><td colspan="4">Không có khoản mục chi tiết</td></tr>'}
      </tbody>
    </table>

    <section class="summary">
      <div class="summary-row"><span>Tiền phòng</span><b>${escapeHtml(formatMoney(invoice.roomAmount))}</b></div>
      <div class="summary-row"><span>Dịch vụ</span><b>${escapeHtml(formatMoney(invoice.serviceAmount))}</b></div>
      <div class="summary-row"><span>Thuế</span><b>${escapeHtml(formatMoney(invoice.tax))}</b></div>
      ${invoice.surcharge > 0 ? `<div class="summary-row"><span>Phụ thu</span><b>${escapeHtml(formatMoney(invoice.surcharge))}</b></div>` : ''}
      ${invoice.discount > 0 ? `<div class="summary-row"><span>Giảm trừ</span><b>−${escapeHtml(formatMoney(invoice.discount))}</b></div>` : ''}
      <div class="summary-row summary-total"><span>Tổng thanh toán</span><span>${escapeHtml(formatMoney(invoice.totalAmount))}</span></div>
      <div class="summary-row"><span>Đã thanh toán</span><b>${escapeHtml(formatMoney(invoice.successfulPayments))}</b></div>
      <div class="summary-row"><span>Còn phải thu</span><b>${escapeHtml(formatMoney(invoice.balanceDue))}</b></div>
    </section>
  </main>
</body>
</html>`
}

export function downloadPrintableInvoice(invoice: Invoice, booking?: Booking | null) {
  const html = buildPrintableInvoiceHtml(invoice, booking)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeCode = (booking?.bookingCode || `HG-${invoice.id}`).replace(/[^a-zA-Z0-9_-]/g, '-')
  link.href = url
  link.download = `hoa-don-${safeCode}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function tryNativePrint(): { inIframe: boolean; threw: boolean } {
  let inIframe = false
  try {
    inIframe = window.self !== window.top
  } catch {
    inIframe = true
  }
  try {
    window.print()
    return { inIframe, threw: false }
  } catch {
    return { inIframe, threw: true }
  }
}
