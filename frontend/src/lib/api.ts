import axios from 'axios'
import type { ApiResponse } from './types'

const TOKEN_KEY = 'maison-an-token'
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event('hotel:unauthorized'))
  }
  return Promise.reject(error)
})
export const tokenKey = TOKEN_KEY
export async function request<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise
  if (!response.data.success) throw new Error(response.data.message || 'Không thể hoàn tất yêu cầu.')
  return response.data.data
}
function localizeMessage(message: string) {
  const normalized = message.trim()
  if (/both check-in and check-out dates are required/i.test(normalized)) return 'Vui lòng chọn đầy đủ ngày nhận phòng và ngày trả phòng.'
  if (/check-out date must be after check-in date|check-out.*after.*check-in/i.test(normalized)) return 'Ngày trả phòng phải sau ngày nhận phòng.'
  if (/booking room does not belong to this booking/i.test(normalized)) return 'Phòng được chọn không thuộc booking này. Vui lòng chọn lại phòng.'
  if (/service is not offered for this room/i.test(normalized)) return 'Dịch vụ này chưa được áp dụng cho phòng đã chọn.'
  if (/room services can only be requested for checked-in bookings/i.test(normalized)) return 'Chỉ có thể ghi nhận dịch vụ cho booking đang lưu trú.'
  if (/room has an active or future booking/i.test(normalized)) return 'Không thể ngừng hoạt động hoặc chuyển bảo trì vì phòng đang có đơn đặt phòng hiện tại hoặc sắp tới.'
  if (/an occupied room cannot change status manually/i.test(normalized)) return 'Phòng đang có khách lưu trú, hãy làm thủ tục trả phòng trước khi đổi trạng thái.'
  if (/an occupied room cannot be taken out of operation/i.test(normalized)) return 'Phòng đang có khách lưu trú, không thể ngừng hoạt động.'
  if (/an inactive room must be activated before changing its status/i.test(normalized)) return 'Cần kích hoạt lại phòng trước khi đổi trạng thái.'
  if (/status can only be set to maintenance or cleaning manually/i.test(normalized)) return 'Chỉ có thể chuyển thủ công sang trạng thái Đang dọn hoặc Bảo trì.'
  if (/room is not in cleaning status/i.test(normalized)) return 'Phòng hiện không ở trạng thái Đang dọn.'
  if (/payment report must be received by the deposit deadline/i.test(normalized)) return 'Đã quá thời hạn đặt cọc của đơn này.'
  if (/verification window has expired/i.test(normalized)) return 'Đơn đã quá thời hạn xác minh cọc.'
  if (/received amount must exactly match the deposit amount/i.test(normalized)) return 'Số tiền thực nhận phải khớp chính xác số tiền cọc yêu cầu.'
  if (/this bank transaction reference has already been used/i.test(normalized)) return 'Mã giao dịch ngân hàng này đã được sử dụng cho đơn khác.'
  if (/deposit is not awaiting verification/i.test(normalized)) return 'Khoản cọc này không còn ở trạng thái chờ xác minh.'
  if (/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(normalized)) return normalized
  const translations: Array<[RegExp, string]> = [
    [/unauthorized|invalid credentials|bad credentials/i, 'Tên đăng nhập hoặc mật khẩu không chính xác.'],
    [/forbidden|access denied/i, 'Bạn không có quyền thực hiện thao tác này.'],
    [/not found|does not exist/i, 'Không tìm thấy dữ liệu được yêu cầu.'],
    [/already exists|duplicate/i, 'Thông tin đã tồn tại trong hệ thống.'],
    [/not available|unavailable|fully booked/i, 'Phòng không còn trống trong khoảng thời gian đã chọn.'],
    [/invalid .*date|date .*invalid/i, 'Ngày lưu trú chưa hợp lệ. Vui lòng kiểm tra lại ngày nhận và ngày trả phòng.'],
    [/required|must not be null|must not be blank/i, 'Vui lòng điền đầy đủ các thông tin bắt buộc.'],
    [/must be greater|must be positive|cannot be negative/i, 'Giá trị nhập chưa hợp lệ. Vui lòng kiểm tra lại.'],
    [/payment|invoice|booking|room/i, 'Không thể hoàn tất yêu cầu đặt phòng. Vui lòng kiểm tra thông tin và thử lại.'],
  ]
  return translations.find(([pattern]) => pattern.test(normalized))?.[1] || 'Yêu cầu chưa thể hoàn tất. Vui lòng kiểm tra thông tin và thử lại.'
}
export function errorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') return localizeMessage(data.message)
    if (!error.response) return 'Không thể kết nối tới hệ thống đặt phòng. Vui lòng thử lại sau.'
  }
  return error instanceof Error ? localizeMessage(error.message) : fallback
}
