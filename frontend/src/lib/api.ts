import axios from 'axios'
import type { ApiResponse } from './types'

const TOKEN_KEY = 'maison-an-token'
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api', headers: { 'Content-Type': 'application/json' } })
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
  if (/check-out date cannot be more than one year from today/i.test(normalized)) return 'Ngày trả phòng tối đa là một năm kể từ hôm nay.'
  if (/booking room does not belong to this booking/i.test(normalized)) return 'Phòng được chọn không thuộc booking này. Vui lòng chọn lại phòng.'
  if (/service is not offered for this room/i.test(normalized)) return 'Dịch vụ này chưa được áp dụng cho phòng đã chọn.'
  if (/room services can only be requested for checked-in bookings/i.test(normalized)) return 'Chỉ có thể ghi nhận dịch vụ cho booking đang lưu trú.'
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
