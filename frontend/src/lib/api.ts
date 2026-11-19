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
export function errorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') return data.message
    if (!error.response) return 'Không thể kết nối tới hệ thống đặt phòng. Vui lòng thử lại sau.'
  }
  return error instanceof Error ? error.message : fallback
}
