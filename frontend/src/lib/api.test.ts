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
})
