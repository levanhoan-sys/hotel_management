import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, BadgeCheck, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { ApiResponse, Role } from '../../lib/types'

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

const registerSchema = z.object({
  username: z.string().min(4, 'Tên đăng nhập cần ít nhất 4 ký tự').max(50),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(72),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.email('Email chưa đúng định dạng'),
  phone: z.string().optional(),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

function AuthField({
  label,
  name,
  register,
  error,
  placeholder,
  type = 'text',
  autoComplete,
  trailing,
}: {
  label: string
  name: string
  register: object
  error?: string
  placeholder?: string
  type?: string
  autoComplete?: string
  trailing?: React.ReactNode
}) {
  return (
    <label className="hg-field" htmlFor={name}>
      <span>{label}</span>
      <div className={`hg-input-wrap ${error ? 'has-error' : ''}`}>
        <input
          id={name}
          {...register}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
        {trailing}
      </div>
      {error && <small className="hg-field-error">{error}</small>}
    </label>
  )
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { signIn, reloadProfile } = useAuth()
  const nav = useNavigate()
  const [redirectParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)

  const schema = mode === 'login' ? loginSchema : registerSchema
  const form = useForm<LoginValues | RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues:
      mode === 'login'
        ? { username: '', password: '' }
        : { username: '', password: '', fullName: '', email: '', phone: '' },
  })

  useEffect(() => {
    setShowPassword(false)
    form.reset(
      mode === 'login'
        ? { username: '', password: '' }
        : { username: '', password: '', fullName: '', email: '', phone: '' },
    )
  }, [mode, form])

  const mutation = useMutation({
    mutationFn: (values: LoginValues | RegisterValues) =>
      request(
        api.post<
          ApiResponse<{
            token: string
            userId: number
            username: string
            fullName: string
            email: string
            role: Role
          }>
        >(mode === 'login' ? '/auth/login' : '/auth/register', values),
      ),
    onSuccess: async (auth) => {
      signIn(auth)
      try {
        await reloadProfile()
      } catch {
        // Auth response remains sufficient for navigation; profile can be retried later.
      }
      await queryClient.invalidateQueries()
      toast.success(mode === 'login' ? 'Chào mừng bạn trở lại.' : 'Tài khoản đã được tạo.')
      const redirect = redirectParams.get('redirect')
      nav(
        auth.role === 'ROLE_CUSTOMER'
          ? redirect?.startsWith('/') && !redirect.startsWith('//')
            ? redirect
            : '/'
          : auth.role === 'ROLE_RECEPTIONIST'
            ? '/reception'
            : '/admin',
      )
    },
    onError: (e) => toast.error(errorMessage(e, mode === 'login' ? 'Không thể đăng nhập.' : 'Không thể tạo tài khoản.')),
  })

  const fieldError = (name: string) =>
    (form.formState.errors as Record<string, { message?: string }>)[name]?.message

  const redirectQuery = redirectParams.get('redirect')
  const switchSuffix = redirectQuery ? `?redirect=${encodeURIComponent(redirectQuery)}` : ''

  return (
    <main className="hg-auth-page">
      <section className="hg-auth-showcase" aria-label="Giới thiệu Hoàng Gia Hotel">
        <div className="hg-auth-showcase-bg" />
        <div className="hg-auth-showcase-scrim" />
        <div className="hg-auth-showcase-inner">
          <div className="hg-auth-brand">
            <img src="/logo-crown-transparent.png" alt="" aria-hidden="true" />
            <div>
              <span className="hg-auth-brand-title">Hoàng Gia Hotel</span>
              <small>HÀ ĐÔNG, HÀ NỘI</small>
            </div>
          </div>

          <div className="hg-auth-quote">
            <p className="hg-serif-em">
              “Có những nơi khiến ta
              <br />
              muốn <em>ở lại lâu hơn.”</em>
            </p>
            <ul className="hg-auth-perks">
              <li>
                <BadgeCheck size={16} aria-hidden="true" />
                <span>Theo dõi lịch sử đặt phòng và hóa đơn rõ ràng</span>
              </li>
              <li>
                <BadgeCheck size={16} aria-hidden="true" />
                <span>Thanh toán đặt cọc VietQR và xác nhận minh bạch</span>
              </li>
              <li>
                <BadgeCheck size={16} aria-hidden="true" />
                <span>Cập nhật thông tin cá nhân nhanh chóng trước khi nhận phòng</span>
              </li>
            </ul>
          </div>
          <small className="hg-auth-caption">Ảnh minh họa · Không gian nghỉ dưỡng Hoàng Gia</small>
        </div>
      </section>

      <section className="hg-auth-form-col">
        <div className="hg-auth-card">
          <nav className="hg-auth-tabs" aria-label="Chuyển đổi đăng nhập hoặc đăng ký">
            <Link to={`/login${switchSuffix}`} className={mode === 'login' ? 'is-active' : ''}>
              Đăng nhập
            </Link>
            <Link to={`/register${switchSuffix}`} className={mode === 'register' ? 'is-active' : ''}>
              Đăng ký
            </Link>
          </nav>

          <div className="hg-auth-head">
            <span className="hg-kicker">
              {mode === 'login' ? 'CHÀO MỪNG BẠN TRỞ LẠI' : 'BẮT ĐẦU HÀNH TRÌNH'}
            </span>
            <h1 className="hg-serif-em">
              {mode === 'login' ? (
                <>
                  Thật vui khi <em>gặp lại.</em>
                </>
              ) : (
                <>
                  Tạo tài khoản <em>của bạn.</em>
                </>
              )}
            </h1>
            <p>
              {mode === 'login'
                ? 'Đăng nhập để tiếp tục đặt phòng và theo dõi các kỳ nghỉ của bạn.'
                : 'Đăng ký tài khoản khách hàng để đặt phòng nhanh và quản lý đơn đặt cọc.'}
            </p>
          </div>

          <form
            className="hg-auth-form"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            {mode === 'register' && (
              <AuthField
                label="Họ và tên"
                name="fullName"
                register={form.register('fullName')}
                error={fieldError('fullName')}
                placeholder="Nguyễn Minh An"
                autoComplete="name"
              />
            )}

            <AuthField
              label="Tên đăng nhập"
              name="username"
              register={form.register('username')}
              error={fieldError('username')}
              placeholder="Tên đăng nhập"
              autoComplete="username"
            />

            {mode === 'register' && (
              <div className="hg-auth-two-col">
                <AuthField
                  label="Email"
                  name="email"
                  register={form.register('email')}
                  error={fieldError('email')}
                  placeholder="ban@email.com"
                  type="email"
                  autoComplete="email"
                />
                <AuthField
                  label="Số điện thoại (không bắt buộc)"
                  name="phone"
                  register={form.register('phone')}
                  error={fieldError('phone')}
                  placeholder="+84"
                  type="tel"
                  autoComplete="tel"
                />
              </div>
            )}

            <AuthField
              label="Mật khẩu"
              name="password"
              register={form.register('password')}
              error={fieldError('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              trailing={
                <button
                  type="button"
                  className="hg-password-toggle"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <button type="submit" className="hg-btn hg-btn-primary hg-auth-submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <span className="spinner small" aria-hidden="true" /> Đang xử lý…
                </>
              ) : mode === 'login' ? (
                <>
                  Đăng nhập <ArrowRight size={16} aria-hidden="true" />
                </>
              ) : (
                <>
                  Tạo tài khoản <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="hg-auth-switch">
            {mode === 'login' ? (
              <>
                Chưa có tài khoản? <Link to={`/register${switchSuffix}`}>Đăng ký ngay</Link>
              </>
            ) : (
              <>
                Đã có tài khoản? <Link to={`/login${switchSuffix}`}>Đăng nhập</Link>
              </>
            )}
          </div>

          <div className="hg-auth-secure">
            <Lock size={14} aria-hidden="true" />
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Thông tin tài khoản được bảo vệ an toàn theo phiên đăng nhập.</span>
          </div>
        </div>
      </section>
    </main>
  )
}
