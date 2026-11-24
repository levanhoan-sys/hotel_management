import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Check, ChevronRight, CircleAlert, Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { ApiResponse, Profile } from '../../lib/types'
import { LoadingSkeleton, StatusBadge } from '../../components/shared'

const profileSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.email('Email chưa đúng định dạng'),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới cần ít nhất 8 ký tự').max(72),
})

export function ProfilePage() {
  const { profile, user, loading, reloadProfile } = useAuth()
  const queryClient = useQueryClient()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profileNotice, setProfileNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [passwordNotice, setPasswordNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const form = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.fullName || user?.fullName || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  })

  const mutation = useMutation({
    mutationFn: (body: { fullName: string; email: string; phone?: string }) =>
      request(api.put<ApiResponse<Profile>>('/users/me', body)),
    onSuccess: async () => {
      const msg = 'Thông tin đã được cập nhật.'
      setProfileNotice({ kind: 'success', text: msg })
      toast.success(msg)
      await reloadProfile()
      await queryClient.invalidateQueries()
    },
    onError: (error) => {
      const msg = errorMessage(error, 'Không thể cập nhật thông tin cá nhân.')
      setProfileNotice({ kind: 'error', text: msg })
      toast.error(msg)
    },
  })

  const passwordMutation = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      request(api.put<ApiResponse<null>>('/users/me/password', body)),
    onSuccess: () => {
      const msg = 'Mật khẩu đã được thay đổi.'
      setPasswordNotice({ kind: 'success', text: msg })
      toast.success(msg)
      passwordForm.reset()
      setShowCurrentPassword(false)
      setShowNewPassword(false)
    },
    onError: (error) => {
      const msg = errorMessage(error, 'Không thể thay đổi mật khẩu.')
      setPasswordNotice({ kind: 'error', text: msg })
      toast.error(msg)
    },
  })

  const displayName = profile?.fullName || user?.fullName || 'Khách hàng'
  const displayUsername = profile?.username || user?.username || ''
  const displayRole = (profile?.role || user?.role) === 'ROLE_CUSTOMER' ? 'Khách hàng' : 'Nhân viên'

  return (
    <main className="hg-account-page hg-profile-page">
      <section className="hg-page-banner hg-account-banner">
        <div className="hg-container hg-account-banner-inner">
          <div className="hg-account-banner-copy">
            <div className="hg-breadcrumb">
              <Link to="/">Trang chủ</Link>
              <ChevronRight size={14} aria-hidden="true" />
              <span>Thông tin cá nhân</span>
            </div>
            <span className="hg-kicker">TÀI KHOẢN HOÀNG GIA HOTEL</span>
            <h1 className="hg-serif-em">
              Thông tin <em>cá nhân</em>
            </h1>
            <p>Quản lý thông tin liên hệ và bảo mật tài khoản của bạn.</p>
          </div>
          <div className="hg-account-banner-actions">
            <nav className="hg-account-switch" aria-label="Điều hướng tài khoản">
              <Link to="/my-bookings">Đơn đặt phòng</Link>
              <Link to="/profile" className="is-active" aria-current="page">
                Thông tin cá nhân
              </Link>
            </nav>
            <Link className="hg-btn hg-btn-outline" to="/my-bookings">
              Lịch sử đặt phòng <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="hg-container hg-account-body">
        {loading ? (
          <LoadingSkeleton variant="cards" count={2} />
        ) : (
          <>
            <section className="hg-panel hg-profile-hero" aria-label="Tổng quan tài khoản">
              <div className="hg-profile-avatar" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hg-profile-identity">
                <h2>{displayName}</h2>
                <div className="hg-profile-meta-line">
                  {displayUsername && <span className="hg-mono">@{displayUsername}</span>}
                  {displayUsername && <span className="hg-meta-sep" aria-hidden="true" />}
                  <span>{displayRole}</span>
                </div>
              </div>
              {profile?.accountStatus && <StatusBadge status={profile.accountStatus} />}
            </section>

            <div className="hg-profile-grid">
              <form
                id="contact"
                className="hg-panel hg-profile-card"
                onSubmit={form.handleSubmit((values) => {
                  setProfileNotice(null)
                  mutation.mutate(values)
                })}
                noValidate
              >
                <div className="hg-profile-card-head">
                  <div>
                    <span className="hg-kicker">THÔNG TIN CÁ NHÂN</span>
                    <h3>Chi tiết liên hệ</h3>
                    <p>Thông tin này được dùng để xác nhận đặt phòng và gửi hóa đơn lưu trú.</p>
                  </div>
                  <UserRound size={20} aria-hidden="true" />
                </div>

                {profileNotice && (
                  <div
                    className={`hg-inline-feedback ${profileNotice.kind === 'success' ? 'is-success' : 'is-error'}`}
                    role={profileNotice.kind === 'success' ? 'status' : 'alert'}
                  >
                    {profileNotice.kind === 'success' ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <CircleAlert size={16} aria-hidden="true" />
                    )}
                    <span>{profileNotice.text}</span>
                  </div>
                )}

                <div className="hg-profile-fields">
                  <label className="hg-field">
                    <span>Họ và tên</span>
                    <div className={`hg-input-wrap ${form.formState.errors.fullName ? 'has-error' : ''}`}>
                      <input {...form.register('fullName')} />
                    </div>
                    {form.formState.errors.fullName && (
                      <small className="hg-field-error">{form.formState.errors.fullName.message}</small>
                    )}
                  </label>

                  <label className="hg-field">
                    <span>Email</span>
                    <div className={`hg-input-wrap ${form.formState.errors.email ? 'has-error' : ''}`}>
                      <input type="email" {...form.register('email')} />
                    </div>
                    {form.formState.errors.email && (
                      <small className="hg-field-error">{form.formState.errors.email.message}</small>
                    )}
                  </label>

                  <label className="hg-field">
                    <span>Số điện thoại</span>
                    <div className="hg-input-wrap">
                      <input {...form.register('phone')} />
                    </div>
                  </label>

                  <label className="hg-field">
                    <span>Tên đăng nhập</span>
                    <div className="hg-input-wrap is-disabled">
                      <input value={displayUsername} disabled />
                    </div>
                  </label>
                </div>

                <div className="hg-profile-actions">
                  <button type="submit" className="hg-btn hg-btn-primary" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'} <Check size={16} aria-hidden="true" />
                  </button>
                </div>
              </form>

              <form
                id="password"
                className="hg-panel hg-profile-card"
                onSubmit={passwordForm.handleSubmit((values) => {
                  setPasswordNotice(null)
                  passwordMutation.mutate(values)
                })}
                noValidate
              >
                <div className="hg-profile-card-head">
                  <div>
                    <span className="hg-kicker">BẢO MẬT TÀI KHOẢN</span>
                    <h3>Đổi mật khẩu</h3>
                    <p>Sử dụng mật khẩu mạnh ít nhất 8 ký tự để bảo vệ thông tin đặt phòng.</p>
                  </div>
                  <KeyRound size={20} aria-hidden="true" />
                </div>

                {passwordNotice && (
                  <div
                    className={`hg-inline-feedback ${passwordNotice.kind === 'success' ? 'is-success' : 'is-error'}`}
                    role={passwordNotice.kind === 'success' ? 'status' : 'alert'}
                  >
                    {passwordNotice.kind === 'success' ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <CircleAlert size={16} aria-hidden="true" />
                    )}
                    <span>{passwordNotice.text}</span>
                  </div>
                )}

                <div className="hg-profile-fields is-single-col">
                  <label className="hg-field">
                    <span>Mật khẩu hiện tại</span>
                    <div className={`hg-input-wrap ${passwordForm.formState.errors.currentPassword ? 'has-error' : ''}`}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        {...passwordForm.register('currentPassword')}
                      />
                      <button
                        type="button"
                        className="hg-password-toggle"
                        aria-label={showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                        onClick={() => setShowCurrentPassword((v) => !v)}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <small className="hg-field-error">
                        {passwordForm.formState.errors.currentPassword.message}
                      </small>
                    )}
                  </label>

                  <label className="hg-field">
                    <span>Mật khẩu mới (tối thiểu 8 ký tự)</span>
                    <div className={`hg-input-wrap ${passwordForm.formState.errors.newPassword ? 'has-error' : ''}`}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...passwordForm.register('newPassword')}
                      />
                      <button
                        type="button"
                        className="hg-password-toggle"
                        aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                        onClick={() => setShowNewPassword((v) => !v)}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <small className="hg-field-error">{passwordForm.formState.errors.newPassword.message}</small>
                    )}
                  </label>
                </div>

                <div className="hg-profile-security-note">
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>Phiên đăng nhập hiện tại vẫn được giữ nguyên sau khi đổi mật khẩu.</span>
                </div>

                <div className="hg-profile-actions">
                  <button type="submit" className="hg-btn hg-btn-primary" disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}{' '}
                    <Check size={16} aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
