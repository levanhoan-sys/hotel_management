import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { errorMessage } from './api'

describe('API error messages', () => {
  it('uses the backend message when available', () => {
    const error = new AxiosError('Request failed')
    error.response = { data: { success: false, message: 'Phòng vừa được đặt.' }, status: 409, statusText: 'Conflict', headers: {}, config: { headers: new AxiosHeaders() } }
    expect(errorMessage(error)).toBe('Phòng vừa được đặt.')
  })

  it('shows a connection hint when no response exists', () => {
    expect(errorMessage(new AxiosError('Network Error'))).toMatch(/Không thể kết nối tới hệ thống đặt phòng/)
  })

  it('localizes Java login and locked account messages clearly', () => {
    const badLogin = new AxiosError('Bad Request')
    badLogin.response = { data: { success: false, message: 'Username or password is incorrect' }, status: 400, statusText: 'Bad Request', headers: {}, config: { headers: new AxiosHeaders() } }
    expect(errorMessage(badLogin)).toBe('Tên đăng nhập hoặc mật khẩu không chính xác.')

    const locked = new AxiosError('Forbidden')
    locked.response = { data: { success: false, message: 'Account is locked' }, status: 403, statusText: 'Forbidden', headers: {}, config: { headers: new AxiosHeaders() } }
    expect(errorMessage(locked)).toBe('Tài khoản hiện đang bị khóa hoặc không khả dụng.')
  })

  it('shows a backend connection hint when Vite proxy returns empty 500/502', () => {
    const proxyDown = new AxiosError('Request failed with status code 500')
    proxyDown.response = { data: '', status: 500, statusText: 'Internal Server Error', headers: {}, config: { headers: new AxiosHeaders() } }
    expect(errorMessage(proxyDown)).toMatch(/Không thể kết nối tới hệ thống đặt phòng/)
  })
})
