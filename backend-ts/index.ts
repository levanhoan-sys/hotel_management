import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HotelStore,
  HttpError,
  PRICING_DEFAULTS,
  addDaysIsoDate,
  nightsBetween,
  todayIsoDate,
  type PaymentMethod,
  type RoleName,
  type RoomStatus,
  type UserEntity,
} from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend')
const DIST_DIR = path.resolve(FRONTEND_DIR, 'dist')
function resolvePort(): number {
  const idx = process.argv.indexOf('--port')
  if (idx !== -1 && process.argv[idx + 1]) {
    const parsed = Number(process.argv[idx + 1])
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  const eqArg = process.argv.find((arg) => arg.startsWith('--port='))
  if (eqArg) {
    const parsed = Number(eqArg.slice('--port='.length))
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return Number(process.env.PORT || 3000)
}

const PORT = resolvePort()
const JWT_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  'local-development-only-token-secret-change-before-deploy-2026'
const TOKEN_TTL_SECONDS = 24 * 60 * 60

const store = new HotelStore()

function ok<T>(data: T, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  }
}

function fail(message: string, data?: unknown) {
  return {
    success: false,
    message,
    data: data ?? null,
    timestamp: new Date().toISOString(),
  }
}

function signToken(user: UserEntity): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const nowSec = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.username,
      userId: user.id,
      role: user.role,
      iat: nowSec,
      exp: nowSec + TOKEN_TTL_SECONDS,
    }),
  ).toString('base64url')
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${sig}`
}

function verifyToken(token: string): { sub: string; userId: number; role: RoleName } | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string
      userId: number
      role: RoleName
      exp: number
    }
    if (!parsed.exp || parsed.exp * 1000 <= Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

interface AuthedRequest extends Request {
  authUser?: UserEntity
}

function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Unauthorized'))
  }
  const token = header.slice(7).trim()
  const claims = verifyToken(token)
  if (!claims) return next(new HttpError(401, 'Invalid or expired token'))
  const user = store.users.find((u) => u.username === claims.sub)
  if (!user || user.accountStatus !== 'ACTIVE') {
    return next(new HttpError(401, 'Account is unavailable'))
  }
  req.authUser = user
  next()
}

function requireRoles(...roles: RoleName[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, (err) => {
      if (err) return next(err)
      if (!req.authUser || !roles.includes(req.authUser.role)) {
        return next(new HttpError(403, 'Access denied'))
      }
      next()
    })
  }
}

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] ?? '' : val ?? ''
}

function paramInt(val: string | string[] | undefined, label = 'ID'): number {
  const n = Number(paramStr(val))
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${label}`)
  return n
}

function optNumber(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined
  const n = Number(val)
  if (!Number.isFinite(n)) throw new HttpError(400, 'Invalid number parameter')
  return n
}

function authResponse(user: UserEntity) {
  return {
    token: signToken(user),
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  }
}

function profileResponse(user: UserEntity) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountStatus: user.accountStatus,
  }
}

function ensureBookingOwnerOrStaff(bookingCustomerId: number, user: UserEntity) {
  const isStaff = user.role === 'ROLE_RECEPTIONIST' || user.role === 'ROLE_ADMIN'
  if (!isStaff && bookingCustomerId !== user.id) {
    throw new HttpError(403, 'Access denied')
  }
}

function buildApiRouter() {
  const api = express.Router()

  // ---------------- AUTH ----------------
  api.post('/auth/register', (req, res) => {
    const body = req.body ?? {}
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = body.phone ? String(body.phone).trim() || null : null
    const identityCard = body.identityCard ? String(body.identityCard).trim() || null : null
    const address = body.address ? String(body.address).trim() || null : null

    if (username.length < 4 || username.length > 50) {
      throw new HttpError(400, 'Username must be between 4 and 50 characters')
    }
    if (password.length < 8 || password.length > 72) {
      throw new HttpError(400, 'Password must be between 8 and 72 characters')
    }
    if (!fullName) throw new HttpError(400, 'Full name is required')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Valid email is required')
    }
    if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new HttpError(409, 'Username is already in use')
    }
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      throw new HttpError(409, 'Email is already in use')
    }

    const user: UserEntity = {
      id: store.allocateId('user'),
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      fullName,
      email,
      phone,
      role: 'ROLE_CUSTOMER',
      accountStatus: 'ACTIVE',
      identityCard,
      address,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
    }
    store.users.push(user)
    res.status(201).json(ok(authResponse(user), 'Đăng ký thành công'))
  })

  api.post('/auth/login', (req, res) => {
    const body = req.body ?? {}
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    if (!username || !password) {
      throw new HttpError(400, 'Username and password are required')
    }
    const user = store.users.find((u) => u.username === username)
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new HttpError(401, 'Invalid credentials')
    }
    if (user.accountStatus !== 'ACTIVE') {
      throw new HttpError(403, 'Account is locked')
    }
    res.json(ok(authResponse(user), 'Đăng nhập thành công'))
  })

  api.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json(ok(authResponse(req.authUser!), 'Thông tin tài khoản'))
  })

  // ---------------- USERS ----------------
  api.get('/users/me', requireAuth, (req: AuthedRequest, res) => {
    res.json(ok(profileResponse(req.authUser!)))
  })

  api.put('/users/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!
    const body = req.body ?? {}
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = body.phone ? String(body.phone).trim() || null : null
    if (!fullName) throw new HttpError(400, 'Full name is required')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Valid email is required')
    }
    if (store.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {
      throw new HttpError(409, 'Email is already in use')
    }
    user.fullName = fullName
    user.email = email
    user.phone = phone
    res.json(ok(profileResponse(user), 'Cập nhật hồ sơ thành công'))
  })

  api.put('/users/me/password', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!
    const body = req.body ?? {}
    const currentPassword = String(body.currentPassword || '')
    const newPassword = String(body.newPassword || '')
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      throw new HttpError(400, 'Mật khẩu hiện tại không chính xác')
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      throw new HttpError(400, 'Mật khẩu mới cần từ 8 đến 72 ký tự')
    }
    user.passwordHash = bcrypt.hashSync(newPassword, 10)
    res.json(ok(null, 'Đổi mật khẩu thành công'))
  })

  // ---------------- PUBLIC CATALOG & ROOMS ----------------
  api.get('/room-types', (_req, res) => {
    res.json(ok(store.roomTypes.map((t) => ({ ...t }))))
  })

  api.get('/services', (_req, res) => {
    const active = store.serviceItems
      .filter((s) => s.active)
      .sort((a, b) => a.name.localeCompare(b.name))
    res.json(ok(active))
  })

  api.get('/rooms', (req, res) => {
    const checkIn = req.query.checkIn ? String(req.query.checkIn) : undefined
    const checkOut = req.query.checkOut ? String(req.query.checkOut) : undefined
    const roomTypeId = optNumber(req.query.roomTypeId)
    const minCapacity = optNumber(req.query.minCapacity)
    const minPrice = optNumber(req.query.minPrice)
    const maxPrice = optNumber(req.query.maxPrice)
    const list = store.searchRooms({ checkIn, checkOut, roomTypeId, minCapacity, minPrice, maxPrice })
    res.json(ok(list.map((r) => store.toRoomResponse(r))))
  })

  api.get('/rooms/available', (req, res) => {
    const checkIn = req.query.checkIn ? String(req.query.checkIn) : undefined
    const checkOut = req.query.checkOut ? String(req.query.checkOut) : undefined
    if (!checkIn || !checkOut) throw new HttpError(400, 'Both check-in and check-out dates are required')
    const list = store.searchRooms({ checkIn, checkOut })
    res.json(ok(list.map((r) => store.toRoomResponse(r))))
  })

  api.get('/rooms/recommendations', (req, res) => {
    const data = store.recommendRooms({
      referenceRoomId: optNumber(req.query.referenceRoomId),
      roomTypeId: optNumber(req.query.roomTypeId),
      checkIn: req.query.checkIn ? String(req.query.checkIn) : undefined,
      checkOut: req.query.checkOut ? String(req.query.checkOut) : undefined,
      guests: optNumber(req.query.guests),
      roomQuantity: optNumber(req.query.roomQuantity),
      alternatives: String(req.query.alternatives || 'false') === 'true',
      limit: optNumber(req.query.limit),
    })
    res.json(ok(data))
  })

  api.get('/rooms/:id/calendar', (req, res) => {
    store.expireStaleBookings()
    const id = paramInt(req.params.id, 'room ID')
    const room = store.rooms.find((r) => r.id === id)
    if (!room) throw new HttpError(404, 'Room not found')
    const from = String(req.query.from || '')
    const to = String(req.query.to || '')
    const span = nightsBetween(from, addDaysIsoDate(to, 1))
    if (!from || !to || to < from || span > 62) {
      throw new HttpError(400, 'Calendar range must be between 1 and 62 days')
    }
    const days: Array<{ date: string; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'UNAVAILABLE' }> = []
    for (let i = 0; i < span; i++) {
      const day = addDaysIsoDate(from, i)
      const nextDay = addDaysIsoDate(day, 1)
      const status =
        !room.operational || room.status === 'MAINTENANCE'
          ? 'UNAVAILABLE'
          : store.hasRoomBlockOverlap(id, day, nextDay)
            ? 'BLOCKED'
            : store.hasRoomBookingOverlap(id, day, nextDay)
              ? 'BOOKED'
              : 'AVAILABLE'
      days.push({ date: day, status })
    }
    res.json(ok(days))
  })

  api.get('/rooms/:id', (req, res) => {
    const id = paramInt(req.params.id, 'room ID')
    const room = store.rooms.find((r) => r.id === id)
    if (!room) throw new HttpError(404, `Room not found with ID: ${id}`)
    res.json(ok(store.toRoomResponse(room)))
  })

  api.post('/rooms', requireRoles('ROLE_RECEPTIONIST', 'ROLE_ADMIN'), (req, res) => {
    const body = req.body ?? {}
    const roomNumber = String(body.roomNumber || '').trim()
    const floor = Number(body.floor)
    const roomTypeId = Number(body.roomTypeId)
    if (!roomNumber) throw new HttpError(400, 'Room number is required')
    if (store.rooms.some((r) => r.roomNumber === roomNumber)) {
      throw new HttpError(409, `Room number ${roomNumber} already exists`)
    }
    const rt = store.roomTypes.find((t) => t.id === roomTypeId)
    if (!rt) {
      throw new HttpError(404, `Room type not found with ID: ${roomTypeId}`)
    }
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.map(String).map((s: string) => s.trim()).filter(Boolean)
      : [...(rt.imageUrls || (rt.imageUrl ? [rt.imageUrl] : []))]
    const room = {
      id: store.allocateId('room'),
      roomNumber,
      floor: Number.isInteger(floor) ? floor : 1,
      roomTypeId,
      status: 'AVAILABLE' as RoomStatus,
      operational: true,
      serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds.map(Number) : [],
      imageUrls,
    }
    store.rooms.push(room)
    res.status(201).json(ok(store.toRoomResponse(room), 'Room created successfully'))
  })

  api.patch('/rooms/:id/status', requireRoles('ROLE_RECEPTIONIST', 'ROLE_ADMIN'), (req, res) => {
    const id = paramInt(req.params.id, 'room ID')
    const status = String(req.query.status || '').toUpperCase() as RoomStatus
    const room = store.rooms.find((r) => r.id === id)
    if (!room) throw new HttpError(404, `Room not found with ID: ${id}`)
    room.status = status
    res.json(ok(null, 'Room status updated successfully'))
  })

  // ---------------- CUSTOMER BOOKINGS & DEPOSIT & REFUNDS ----------------
  api.post('/bookings', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!
    if (user.role !== 'ROLE_CUSTOMER') {
      throw new HttpError(400, 'Only a customer can create a personal booking')
    }
    const body = req.body ?? {}
    const booking = store.createBooking(
      {
        customerId: user.id,
        checkInDate: String(body.checkInDate || ''),
        checkOutDate: String(body.checkOutDate || ''),
        roomIds: Array.isArray(body.roomIds) ? body.roomIds.map(Number) : [],
        guestCounts: body.guestCounts,
        pricingType: body.pricingType,
      },
      true,
    )
    res.status(201).json(ok(booking, 'Booking created successfully'))
  })

  api.get('/bookings/me', requireAuth, (req: AuthedRequest, res) => {
    store.expireStaleBookings()
    const user = req.authUser!
    if (user.role !== 'ROLE_CUSTOMER') throw new HttpError(400, 'Tài khoản không phải khách hàng')
    const list = store.bookings
      .filter((b) => b.customerId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map((b) => store.toBookingResponse(b))
    res.json(ok(list))
  })

  api.get('/bookings/my', requireAuth, (req: AuthedRequest, res) => {
    store.expireStaleBookings()
    const user = req.authUser!
    if (user.role !== 'ROLE_CUSTOMER') throw new HttpError(400, 'Only a customer can view personal bookings')
    const page = Number(req.query.page ?? 0)
    const size = Number(req.query.size ?? 20)
    if (page < 0 || size < 1 || size > 100) throw new HttpError(400, 'Invalid page or size')
    const all = store.bookings
      .filter((b) => b.customerId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map((b) => store.toBookingResponse(b))
    const content = all.slice(page * size, page * size + size)
    res.json(
      ok({
        content,
        totalElements: all.length,
        totalPages: Math.ceil(all.length / size),
        number: page,
        size,
      }),
    )
  })

  api.get('/bookings/customer/:customerId', requireAuth, (req: AuthedRequest, res) => {
    const customerId = paramInt(req.params.customerId, 'customer ID')
    ensureBookingOwnerOrStaff(customerId, req.authUser!)
    const list = store.bookings
      .filter((b) => b.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map((b) => store.toBookingResponse(b))
    res.json(ok(list))
  })

  api.get('/bookings/:id', requireAuth, (req: AuthedRequest, res) => {
    store.expireStaleBookings()
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, `Booking not found with ID: ${id}`)
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    res.json(ok(store.toBookingResponse(booking)))
  })

  api.post('/bookings/:id/services', requireAuth, (req: AuthedRequest, res) => {
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    if (booking.status !== 'CHECKED_IN') {
      throw new HttpError(400, 'Room services can only be requested for checked-in bookings')
    }
    const existingInvoice = store.invoices.find((i) => i.bookingId === id)
    if (existingInvoice && existingInvoice.status !== 'DRAFT') {
      throw new HttpError(409, 'Service usage cannot be changed after the invoice is issued')
    }
    const body = req.body ?? {}
    const serviceItemId = Number(body.serviceItemId)
    const quantity = Number(body.quantity)
    const details = store.bookingDetails.filter((d) => d.bookingId === id)
    let detailId = body.bookingRoomId ? Number(body.bookingRoomId) : null
    if (!detailId) {
      if (details.length !== 1) {
        throw new HttpError(400, 'bookingRoomId is required when a booking contains multiple rooms')
      }
      detailId = details[0].id
    }
    const detail = details.find((d) => d.id === detailId)
    if (!detail) throw new HttpError(400, 'Booking room does not belong to this booking')
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, 'Quantity must be greater than zero')
    }
    const svc = store.serviceItems.find((s) => s.id === serviceItemId)
    if (!svc) throw new HttpError(404, 'Service not found')
    if (!svc.active) throw new HttpError(400, 'Service is not currently available')
    const room = store.rooms.find((r) => r.id === detail.roomId)
    if (!room || !room.serviceIds.includes(serviceItemId)) {
      throw new HttpError(400, 'Service is not offered for this room')
    }

    store.serviceOrders.push({
      id: store.allocateId('order'),
      bookingId: id,
      bookingDetailId: detail.id,
      serviceItemId: svc.id,
      quantity,
      unitPrice: svc.unitPrice,
      approvalStatus: 'PENDING',
      cancelled: false,
      orderedAt: new Date().toISOString(),
      cancelledAt: null,
      cancellationReason: null,
    })
    res.json(ok(store.toBookingResponse(booking), 'Yêu cầu dịch vụ đã được gửi, chờ lễ tân duyệt'))
  })

  api.get('/bookings/:id/cancellation-preview', requireAuth, (req: AuthedRequest, res) => {
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    res.json(ok(store.calculateCancellationPreview(booking)))
  })

  api.patch('/bookings/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
    store.expireStaleBookings()
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    if (!['PENDING_DEPOSIT', 'PENDING_VERIFICATION', 'PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new HttpError(400, 'Booking cannot be cancelled in its current state')
    }
    const preview = store.calculateCancellationPreview(booking)
    booking.status = 'CANCELLED'
    booking.cancelledAt = new Date().toISOString()
    booking.cancelledBy = req.authUser!.username
    booking.cancellationReason = req.body?.reason ? String(req.body.reason).trim() || null : null
    if (preview.refundAmount > 0 && !store.refunds.some((r) => r.bookingId === id)) {
      const refId = store.allocateId('refund')
      store.refunds.push({
        id: refId,
        bookingId: id,
        code: `RF-${booking.bookingCode.replace(/[^A-Z0-9]/g, '')}-${refId}`,
        amount: preview.refundAmount,
        status: 'PENDING',
        reference: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
      })
    }
    res.json(ok(null, 'Booking cancelled successfully'))
  })

  // ---------------- DEPOSIT & VIETQR ----------------
  api.get('/bookings/:bookingId/deposit', requireAuth, (req: AuthedRequest, res) => {
    store.expireStaleBookings()
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    const latest = [...store.payments]
      .reverse()
      .find((p) => p.bookingId === bookingId && p.type === 'DEPOSIT')
    res.json(
      ok({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        deadline: booking.depositDeadline,
        paymentId: latest?.id ?? null,
        paymentStatus: latest?.status ?? null,
        reportedAt: booking.depositReportedAt,
        verificationDeadline: booking.verificationDeadline,
      }),
    )
  })

  api.get('/bookings/:bookingId/deposit/qr', requireAuth, (req: AuthedRequest, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    res.json(ok(store.getVietQr(booking)))
  })

  api.post('/bookings/:bookingId/deposit/report', requireAuth, (req: AuthedRequest, res) => {
    store.expireStaleBookings()
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    const now = new Date()
    if (
      booking.status !== 'PENDING_DEPOSIT' ||
      !booking.depositDeadline ||
      now.getTime() > Date.parse(booking.depositDeadline)
    ) {
      throw new HttpError(400, 'Payment report must be received by the deposit deadline')
    }
    let payment = [...store.payments]
      .reverse()
      .find((p) => p.bookingId === bookingId && p.type === 'DEPOSIT')
    if (!payment) {
      payment = {
        id: store.allocateId('payment'),
        bookingId,
        invoiceId: null,
        type: 'DEPOSIT',
        amount: booking.depositAmount ?? 0,
        method: 'BANK_TRANSFER',
        status: 'PENDING',
        idempotencyKey: `DEPOSIT-${booking.bookingCode}`,
        reference: null,
        confirmedTransactionReference: null,
        confirmedBy: null,
        reportedAt: null,
        paidAt: null,
        createdAt: now.toISOString(),
      }
      store.payments.push(payment)
    }
    if (payment.status !== 'REPORTED') {
      if (payment.status !== 'PENDING') {
        throw new HttpError(409, 'Deposit payment cannot be reported in its current state')
      }
      payment.status = 'REPORTED'
      payment.reportedAt = now.toISOString()
      booking.depositReportedAt = now.toISOString()
      booking.verificationDeadline = new Date(now.getTime() + 30 * 60_000).toISOString()
      booking.status = 'PENDING_VERIFICATION'
    }
    res.json(
      ok({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        deadline: booking.depositDeadline,
        paymentId: payment.id,
        paymentStatus: payment.status,
        reportedAt: booking.depositReportedAt,
        verificationDeadline: booking.verificationDeadline,
      }),
    )
  })

  api.post('/bookings/:bookingId/deposit/payment', requireAuth, (req: AuthedRequest, res) => {
    store.expireStaleBookings()
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    if (
      booking.status !== 'PENDING_DEPOSIT' ||
      !booking.depositDeadline ||
      Date.now() >= Date.parse(booking.depositDeadline)
    ) {
      throw new HttpError(400, 'Booking is no longer awaiting a deposit')
    }
    const key = String(req.body?.idempotencyKey || '').trim() || crypto.randomUUID()
    const existing = store.payments.find((p) => p.idempotencyKey === key)
    if (existing) {
      if (existing.bookingId !== bookingId || existing.type !== 'DEPOSIT') {
        throw new HttpError(409, 'Idempotency key belongs to another payment')
      }
      return res.json(
        ok({
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          amount: booking.depositAmount,
          deadline: booking.depositDeadline,
          paymentId: existing.id,
          paymentStatus: existing.status,
          reportedAt: booking.depositReportedAt,
          verificationDeadline: booking.verificationDeadline,
        }),
      )
    }
    const payment = {
      id: store.allocateId('payment'),
      bookingId,
      invoiceId: null,
      type: 'DEPOSIT' as const,
      amount: booking.depositAmount ?? 0,
      method: 'BANK_TRANSFER' as PaymentMethod,
      status: 'PENDING' as const,
      idempotencyKey: key,
      reference: null,
      confirmedTransactionReference: null,
      confirmedBy: null,
      reportedAt: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
    }
    store.payments.push(payment)
    res.json(
      ok({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        deadline: booking.depositDeadline,
        paymentId: payment.id,
        paymentStatus: payment.status,
        reportedAt: booking.depositReportedAt,
        verificationDeadline: booking.verificationDeadline,
      }),
    )
  })

  api.post('/bookings/:bookingId/deposit/demo-complete/:paymentId', requireAuth, (req: AuthedRequest, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const paymentId = paramInt(req.params.paymentId, 'payment ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    const payment = store.payments.find((p) => p.id === paymentId)
    if (!payment || payment.bookingId !== bookingId || payment.type !== 'DEPOSIT') {
      throw new HttpError(400, 'Payment does not belong to booking')
    }
    const now = new Date().toISOString()
    payment.status = 'SUCCESSFUL'
    payment.reference = `DEMO-${crypto.randomUUID()}`
    payment.paidAt = now
    booking.depositPaidAt = now
    booking.status = 'CONFIRMED'
    booking.confirmedAt = now
    res.json(
      ok({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        deadline: booking.depositDeadline,
        paymentId: payment.id,
        paymentStatus: payment.status,
        reportedAt: booking.depositReportedAt,
        verificationDeadline: booking.verificationDeadline,
      }),
    )
  })

  api.get('/bookings/:bookingId/refunds', requireAuth, (req: AuthedRequest, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    const list = store.refunds.filter((r) => r.bookingId === bookingId)
    res.json(ok(list))
  })

  api.get('/invoices/booking/:bookingId', requireAuth, (req: AuthedRequest, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    ensureBookingOwnerOrStaff(booking.customerId, req.authUser!)
    const invoice = store.invoices.find((i) => i.bookingId === bookingId)
    if (!invoice) throw new HttpError(404, 'Invoice not found for booking')
    res.json(ok(store.toInvoiceResponse(invoice)))
  })

  // ---------------- RECEPTION & ADMIN OPERATIONS ----------------
  const staffGuard = requireRoles('ROLE_RECEPTIONIST', 'ROLE_ADMIN')

  api.get('/reception/summary', staffGuard, (_req, res) => {
    store.expireStaleBookings()
    const totalRooms = store.rooms.length
    const countStatus = (s: RoomStatus) => store.rooms.filter((r) => r.status === s).length
    const revenue = Math.round(
      store.invoices.filter((i) => i.isPaid).reduce((sum, i) => sum + i.totalAmount, 0),
    )
    res.json(
      ok({
        totalRooms,
        availableRooms: countStatus('AVAILABLE'),
        occupiedRooms: countStatus('OCCUPIED'),
        cleaningRooms: countStatus('CLEANING'),
        maintenanceRooms: countStatus('MAINTENANCE'),
        confirmedBookings: store.bookings.filter((b) => b.status === 'CONFIRMED').length,
        checkedInBookings: store.bookings.filter((b) => b.status === 'CHECKED_IN').length,
        totalCustomers: store.users.filter((u) => u.role === 'ROLE_CUSTOMER').length,
        revenue,
      }),
    )
  })

  api.get('/reception/customers', staffGuard, (_req, res) => {
    const customers = store.users.filter((u) => u.role === 'ROLE_CUSTOMER')
    res.json(
      ok(
        customers.map((c) => {
          const cb = store.bookings.filter((b) => b.customerId === c.id)
          const active = cb.find((b) => b.status === 'CHECKED_IN')
          const upcoming = cb.find((b) => b.status === 'CONFIRMED')
          const relevant = active ?? upcoming
          const stayStatus = active
            ? 'Đang lưu trú'
            : upcoming
              ? 'Có đặt phòng sắp tới'
              : cb.length === 0
                ? 'Chưa có đặt phòng'
                : 'Không lưu trú'
          return {
            id: c.id,
            username: c.username,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            identityCard: c.identityCard ?? '',
            address: c.address ?? '',
            loyaltyPoints: c.loyaltyPoints ?? 0,
            stayStatus,
            currentBookingId: relevant?.id ?? null,
          }
        }),
      ),
    )
  })

  api.get('/reception/rooms', staffGuard, (_req, res) => {
    res.json(ok(store.rooms.map((r) => store.toRoomResponse(r))))
  })

  api.post('/reception/rooms', staffGuard, (req, res) => {
    const body = req.body ?? {}
    const roomNumber = String(body.roomNumber || '').trim()
    const floor = Number(body.floor)
    const roomTypeId = Number(body.roomTypeId)
    if (!roomNumber) throw new HttpError(400, 'Room number is required')
    if (store.rooms.some((r) => r.roomNumber === roomNumber)) {
      throw new HttpError(409, `Room number ${roomNumber} already exists`)
    }
    const rt = store.roomTypes.find((t) => t.id === roomTypeId)
    if (!rt) {
      throw new HttpError(404, 'Room type not found')
    }
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.map(String).map((s: string) => s.trim()).filter(Boolean)
      : [...(rt.imageUrls || (rt.imageUrl ? [rt.imageUrl] : []))]
    const room = {
      id: store.allocateId('room'),
      roomNumber,
      floor: Number.isInteger(floor) ? floor : 1,
      roomTypeId,
      status: 'AVAILABLE' as RoomStatus,
      operational: true,
      serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds.map(Number) : [],
      imageUrls,
    }
    store.rooms.push(room)
    res.status(201).json(ok(store.toRoomResponse(room), 'Room created successfully'))
  })

  api.put('/reception/rooms/:id', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'room ID')
    const room = store.rooms.find((r) => r.id === id)
    if (!room) throw new HttpError(404, 'Room not found')
    const body = req.body ?? {}
    const roomNumber = String(body.roomNumber || '').trim()
    const floor = Number(body.floor)
    const roomTypeId = Number(body.roomTypeId)
    if (!roomNumber) throw new HttpError(400, 'Room number is required')
    if (store.rooms.some((r) => r.roomNumber === roomNumber && r.id !== id)) {
      throw new HttpError(409, 'Room number is already in use')
    }
    const rt = store.roomTypes.find((t) => t.id === roomTypeId)
    if (!rt) {
      throw new HttpError(404, 'Room type not found')
    }
    const typeChanged = room.roomTypeId !== roomTypeId
    room.roomNumber = roomNumber
    room.floor = Number.isInteger(floor) ? floor : room.floor
    room.roomTypeId = roomTypeId
    room.serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds.map(Number) : []
    if (Array.isArray(body.imageUrls)) {
      room.imageUrls = body.imageUrls.map(String).map((s: string) => s.trim()).filter(Boolean)
    } else if (typeChanged) {
      room.imageUrls = [...(rt.imageUrls || (rt.imageUrl ? [rt.imageUrl] : []))]
    }
    res.json(ok(store.toRoomResponse(room), 'Room updated successfully'))
  })

  api.patch('/reception/rooms/:id/status', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'room ID')
    const status = String(req.query.status || '').toUpperCase() as RoomStatus
    const room = store.rooms.find((r) => r.id === id)
    if (!room) throw new HttpError(404, 'Room not found')
    if (room.status === 'OCCUPIED' && status !== 'OCCUPIED') {
      throw new HttpError(400, 'An occupied room cannot change status manually before check-out')
    }
    if (!room.operational && status !== 'MAINTENANCE') {
      throw new HttpError(400, 'An inactive room must be activated before changing its status')
    }
    if (status === 'MAINTENANCE' && store.hasActiveOrFutureBooking(id, todayIsoDate())) {
      throw new HttpError(400, 'Room has an active or future booking')
    }
    if (status === 'AVAILABLE' && (room.status === 'CLEANING' || room.status === 'MAINTENANCE')) {
      room.status = 'AVAILABLE'
    } else if (status === 'MAINTENANCE' || status === 'CLEANING') {
      room.status = status
    } else if (status !== room.status) {
      throw new HttpError(400, 'Status can only be set to MAINTENANCE or CLEANING manually')
    }
    res.json(ok(null, 'Room status updated successfully'))
  })

  api.patch('/reception/rooms/:id/operational', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'room ID')
    const active = String(req.query.active) === 'true'
    const room = store.rooms.find((r) => r.id === id)
    if (!room) throw new HttpError(404, 'Room not found')
    if (!active && room.status === 'OCCUPIED') {
      throw new HttpError(400, 'An occupied room cannot be taken out of operation')
    }
    if (!active && store.hasActiveOrFutureBooking(id, todayIsoDate())) {
      throw new HttpError(400, 'Room has an active or future booking')
    }
    room.operational = active
    if (!active) room.status = 'MAINTENANCE'
    else if (room.status === 'MAINTENANCE') room.status = 'AVAILABLE'
    res.json(ok(null, active ? 'Room activated' : 'Room taken out of operation'))
  })

  api.patch('/reception/rooms/:roomId/cleaned', staffGuard, (req, res) => {
    const roomId = paramInt(req.params.roomId, 'room ID')
    const room = store.rooms.find((r) => r.id === roomId)
    if (!room) throw new HttpError(404, `Room not found with ID: ${roomId}`)
    if (room.status !== 'CLEANING') {
      throw new HttpError(400, 'Room is not in CLEANING status')
    }
    room.status = 'AVAILABLE'
    res.json(ok(null, 'Room marked as cleaned and available'))
  })

  api.get('/reception/room-types', staffGuard, (_req, res) => {
    res.json(ok(store.roomTypes.map((t) => ({ ...t }))))
  })

  api.post('/reception/room-types', staffGuard, (req, res) => {
    const body = req.body ?? {}
    const name = String(body.name || '').trim()
    const basePrice = Number(body.basePrice)
    const capacity = Number(body.capacity)
    if (!name || !Number.isFinite(basePrice) || basePrice <= 0 || !Number.isInteger(capacity) || capacity < 1) {
      throw new HttpError(400, 'Invalid room type details')
    }
    if (store.roomTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, 'Room type name is already in use')
    }
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null
    const rawGallery = Array.isArray(body.imageUrls)
      ? body.imageUrls.map(String).map((s: string) => s.trim()).filter(Boolean)
      : []
    const imageUrls = rawGallery.length ? rawGallery : imageUrl ? [imageUrl] : []
    const rt = {
      id: store.allocateId('roomType'),
      name,
      basePrice,
      capacity,
      description: body.description ? String(body.description) : null,
      imageUrl: imageUrls[0] ?? imageUrl,
      imageUrls,
      areaSqm: body.areaSqm ? Number(body.areaSqm) : null,
      amenities: body.amenities ? String(body.amenities) : null,
    }
    store.roomTypes.push(rt)
    res.status(201).json(ok(rt, 'Room type created successfully'))
  })

  api.put('/reception/room-types/:id', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'room type ID')
    const rt = store.roomTypes.find((t) => t.id === id)
    if (!rt) throw new HttpError(404, 'Room type not found')
    const body = req.body ?? {}
    const name = String(body.name || '').trim()
    const basePrice = Number(body.basePrice)
    const capacity = Number(body.capacity)
    if (!name || !Number.isFinite(basePrice) || basePrice <= 0 || !Number.isInteger(capacity) || capacity < 1) {
      throw new HttpError(400, 'Invalid room type details')
    }
    if (store.roomTypes.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, 'Room type name is already in use')
    }
    const nextImageUrl = body.imageUrl ? String(body.imageUrl).trim() : null
    const nextGallery = Array.isArray(body.imageUrls)
      ? body.imageUrls.map(String).map((s: string) => s.trim()).filter(Boolean)
      : nextImageUrl
        ? [nextImageUrl, ...rt.imageUrls.filter((u) => u !== nextImageUrl)].slice(0, 5)
        : []
    rt.name = name
    rt.basePrice = basePrice
    rt.capacity = capacity
    rt.description = body.description ? String(body.description) : null
    rt.imageUrl = nextImageUrl ?? nextGallery[0] ?? null
    rt.imageUrls = nextGallery
    rt.areaSqm = body.areaSqm ? Number(body.areaSqm) : null
    rt.amenities = body.amenities ? String(body.amenities) : null
    res.json(ok(rt, 'Room type updated successfully'))
  })

  api.get('/reception/rooms/:roomId/blocks', staffGuard, (req, res) => {
    const roomId = paramInt(req.params.roomId, 'room ID')
    if (!store.rooms.some((r) => r.id === roomId)) throw new HttpError(404, 'Room not found')
    const blocks = store.roomBlocks
      .filter((b) => b.roomId === roomId)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    res.json(ok(blocks))
  })

  api.post('/reception/rooms/:roomId/blocks', staffGuard, (req, res) => {
    const roomId = paramInt(req.params.roomId, 'room ID')
    const room = store.rooms.find((r) => r.id === roomId)
    if (!room) throw new HttpError(404, 'Room not found')
    const body = req.body ?? {}
    const startDate = String(body.startDate || '')
    const endDate = String(body.endDate || '')
    const reason = String(body.reason || '').trim()
    if (!startDate || !endDate || endDate <= startDate) {
      throw new HttpError(400, 'Block end date must be after start date')
    }
    const today = todayIsoDate()
    if (room.status === 'OCCUPIED' && startDate <= today && endDate > today) {
      throw new HttpError(400, 'An occupied room cannot be blocked for its current stay')
    }
    if (store.hasRoomBookingOverlap(roomId, startDate, endDate)) {
      throw new HttpError(400, 'Room has a booking during the selected dates')
    }
    if (store.hasRoomBlockOverlap(roomId, startDate, endDate)) {
      throw new HttpError(409, 'Room already has a block during the selected dates')
    }
    const block = { id: store.allocateId('block'), roomId, startDate, endDate, reason }
    store.roomBlocks.push(block)
    res.status(201).json(ok(block, 'Room block created'))
  })

  api.delete('/reception/room-blocks/:blockId', staffGuard, (req, res) => {
    const blockId = paramInt(req.params.blockId, 'block ID')
    const idx = store.roomBlocks.findIndex((b) => b.id === blockId)
    if (idx === -1) throw new HttpError(404, 'Room block not found')
    store.roomBlocks.splice(idx, 1)
    res.json(ok(null, 'Room block deleted'))
  })

  api.get('/reception/bookings', staffGuard, (_req, res) => {
    store.expireStaleBookings()
    const list = [...store.bookings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map((b) => store.toBookingResponse(b))
    res.json(ok(list))
  })

  api.get('/reception/bookings/page', staffGuard, (req, res) => {
    store.expireStaleBookings()
    const page = Number(req.query.page ?? 0)
    const size = Number(req.query.size ?? 20)
    if (page < 0 || size < 1 || size > 100) throw new HttpError(400, 'Invalid page or size')
    const all = [...store.bookings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map((b) => store.toBookingResponse(b))
    res.json(
      ok({
        content: all.slice(page * size, page * size + size),
        totalElements: all.length,
        totalPages: Math.ceil(all.length / size),
        number: page,
        size,
      }),
    )
  })

  api.post('/reception/bookings', staffGuard, (req, res) => {
    const body = req.body ?? {}
    const booking = store.createBooking(
      {
        customerId: Number(body.customerId),
        checkInDate: String(body.checkInDate || ''),
        checkOutDate: String(body.checkOutDate || ''),
        roomIds: Array.isArray(body.roomIds) ? body.roomIds.map(Number) : [],
        guestCounts: body.guestCounts,
        pricingType: body.pricingType,
      },
      false,
    )
    res.status(201).json(ok(booking, 'Booking created successfully'))
  })

  api.patch('/reception/bookings/:id/confirm', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, `Booking not found with ID: ${id}`)
    if (booking.status !== 'PENDING') throw new HttpError(400, 'Only pending bookings can be confirmed')
    booking.status = 'CONFIRMED'
    booking.confirmedAt = new Date().toISOString()
    res.json(ok(store.toBookingResponse(booking), 'Booking confirmed'))
  })

  api.patch('/reception/bookings/:id/reject', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, `Booking not found with ID: ${id}`)
    if (booking.status !== 'PENDING') throw new HttpError(400, 'Only pending bookings can be rejected')
    booking.status = 'REJECTED'
    booking.rejectionReason = req.body?.reason ? String(req.body.reason).trim() || null : null
    res.json(ok(store.toBookingResponse(booking), 'Booking rejected'))
  })

  api.patch('/reception/bookings/:id/cancel', staffGuard, (req: AuthedRequest, res) => {
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, `Booking not found with ID: ${id}`)
    if (!['CONFIRMED', 'PENDING', 'PENDING_DEPOSIT', 'PENDING_VERIFICATION'].includes(booking.status)) {
      throw new HttpError(400, 'Only pending or confirmed bookings can be cancelled')
    }
    booking.status = 'CANCELLED'
    booking.cancelledAt = new Date().toISOString()
    booking.cancelledBy = req.authUser!.username
    booking.cancellationReason = req.body?.reason ? String(req.body.reason).trim() || null : null
    res.json(ok(null, 'Booking cancelled'))
  })

  api.put('/reception/bookings/:id/rooms', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'booking ID')
    const booking = store.bookings.find((b) => b.id === id)
    if (!booking) throw new HttpError(404, `Booking not found with ID: ${id}`)
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      throw new HttpError(400, 'Rooms can only be changed for pending or confirmed bookings')
    }
    const body = req.body ?? {}
    const roomIds: number[] = Array.isArray(body.roomIds) ? body.roomIds.map(Number) : []
    if (!roomIds.length) throw new HttpError(400, 'At least one room is required')
    if (new Set(roomIds).size !== roomIds.length) throw new HttpError(400, 'A room cannot appear more than once')
    const today = todayIsoDate()
    const multiplier = store.pricingRates.STANDARD ?? 1
    const newDetails = roomIds.map((roomId) => {
      const room = store.rooms.find((r) => r.id === roomId)
      if (!room) throw new HttpError(404, 'One or more selected rooms do not exist')
      const rt = store.roomTypes.find((t) => t.id === room.roomTypeId)!
      if (!room.operational || room.status === 'MAINTENANCE' || (booking.checkInDate === today && room.status !== 'AVAILABLE')) {
        throw new HttpError(409, `Room ${room.roomNumber} is not available`)
      }
      if (store.hasRoomBookingOverlap(roomId, booking.checkInDate, booking.checkOutDate, id)) {
        throw new HttpError(409, `Room ${room.roomNumber} is already booked for the selected dates`)
      }
      if (store.hasRoomBlockOverlap(roomId, booking.checkInDate, booking.checkOutDate)) {
        throw new HttpError(409, `Room ${room.roomNumber} is blocked for the selected dates`)
      }
      const guests = body.guestCounts?.[String(roomId)] ?? 1
      if (guests < 1 || guests > rt.capacity) {
        throw new HttpError(400, `Guest count is invalid for room ${room.roomNumber}`)
      }
      return {
        id: store.allocateId('detail'),
        bookingId: id,
        roomId,
        pricePerNight: Math.round(rt.basePrice * multiplier),
        guestCount: guests,
      }
    })
    store.bookingDetails = store.bookingDetails.filter((d) => d.bookingId !== id)
    store.bookingDetails.push(...newDetails)
    res.json(ok(store.toBookingResponse(booking), 'Booking rooms updated'))
  })

  api.post('/reception/bookings/:bookingId/check-in', staffGuard, (req, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, `Booking not found with ID: ${bookingId}`)
    if (booking.status !== 'CONFIRMED') {
      throw new HttpError(400, `Only CONFIRMED bookings can be checked in. Current status: ${booking.status}`)
    }
    if (todayIsoDate() < booking.checkInDate) {
      throw new HttpError(400, 'Chưa đến ngày nhận phòng')
    }
    const details = store.bookingDetails.filter((d) => d.bookingId === bookingId)
    if (!details.length) throw new HttpError(400, 'Booking has no rooms')
    const rooms = details.map((d) => {
      const r = store.rooms.find((rm) => rm.id === d.roomId)
      if (!r) throw new HttpError(400, 'One or more booked rooms no longer exist')
      if (!r.operational || r.status !== 'AVAILABLE') {
        throw new HttpError(400, `Room ${r.roomNumber} is not ready for check-in`)
      }
      return r
    })
    booking.status = 'CHECKED_IN'
    booking.checkedInAt = new Date().toISOString()
    rooms.forEach((r) => {
      r.status = 'OCCUPIED'
    })
    res.json(ok(store.toBookingResponse(booking), 'Check-in completed successfully'))
  })

  api.post('/reception/bookings/:bookingId/check-out', staffGuard, (req, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    const invoice = store.invoices.find((i) => i.bookingId === bookingId)
    if (!invoice) throw new HttpError(400, 'An invoice must be issued and paid before checkout')
    if (booking.status === 'COMPLETED' && invoice.status === 'PAID') {
      return res.json(ok(store.toInvoiceResponse(invoice), 'Check-out completed and invoice generated'))
    }
    if (booking.status !== 'CHECKED_IN') {
      throw new HttpError(400, 'Only checked-in bookings can check out')
    }
    if (invoice.status !== 'PAID' || invoice.balanceDue > 0) {
      throw new HttpError(400, 'Invoice must be fully paid before checkout')
    }
    const details = store.bookingDetails.filter((d) => d.bookingId === bookingId)
    const rooms = details.map((d) => {
      const r = store.rooms.find((rm) => rm.id === d.roomId)
      if (!r || !r.operational || r.status !== 'OCCUPIED') {
        throw new HttpError(400, `Room ${r?.roomNumber ?? d.roomId} is not occupied by this booking`)
      }
      return r
    })
    booking.status = 'COMPLETED'
    booking.checkedOutAt = new Date().toISOString()
    rooms.forEach((r) => {
      r.status = 'CLEANING'
    })
    res.json(ok(store.toInvoiceResponse(invoice), 'Check-out completed and invoice generated'))
  })

  // ---------------- RECEPTION SERVICES ----------------
  api.get('/reception/services', staffGuard, (_req, res) => {
    res.json(ok(store.serviceItems.map((s) => ({ ...s }))))
  })

  api.post('/reception/services', staffGuard, (req, res) => {
    const body = req.body ?? {}
    const name = String(body.name || '').trim()
    const unitPrice = Number(body.unitPrice)
    const unit = body.unit ? String(body.unit).trim() : 'lần'
    if (!name || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new HttpError(400, 'Invalid service details')
    }
    if (store.serviceItems.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, 'Service name is already in use')
    }
    const item = { id: store.allocateId('service'), name, unitPrice, unit, active: true }
    store.serviceItems.push(item)
    res.status(201).json(ok(item, 'Service created'))
  })

  api.put('/reception/services/:id', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'service ID')
    const svc = store.serviceItems.find((s) => s.id === id)
    if (!svc) throw new HttpError(404, 'Service not found')
    const body = req.body ?? {}
    const name = String(body.name || '').trim()
    const unitPrice = Number(body.unitPrice)
    const unit = body.unit ? String(body.unit).trim() : svc.unit
    if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpError(400, 'Invalid service details')
    }
    if (store.serviceItems.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, 'Service name is already in use')
    }
    svc.name = name
    svc.unitPrice = unitPrice
    svc.unit = unit
    res.json(ok(svc, 'Service updated'))
  })

  api.patch('/reception/services/:id/active', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'service ID')
    const svc = store.serviceItems.find((s) => s.id === id)
    if (!svc) throw new HttpError(404, 'Service not found')
    svc.active = String(req.query.active) === 'true'
    res.json(ok(svc, svc.active ? 'Service activated' : 'Service deactivated'))
  })

  api.get('/reception/bookings/:bookingId/service-usages', staffGuard, (req, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    if (!store.bookings.some((b) => b.id === bookingId)) throw new HttpError(404, 'Booking not found')
    const list = store.serviceOrders
      .filter((o) => o.bookingId === bookingId)
      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
      .map((o) => store.toServiceUsageResponse(o))
    res.json(ok(list))
  })

  api.get('/reception/service-usages/pending', staffGuard, (_req, res) => {
    const list = store.serviceOrders
      .filter((o) => o.approvalStatus === 'PENDING' && !o.cancelled)
      .sort((a, b) => a.orderedAt.localeCompare(b.orderedAt))
      .map((o) => store.toServiceUsageResponse(o))
    res.json(ok(list))
  })

  api.post('/reception/bookings/:bookingId/service-usages', staffGuard, (req, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    if (booking.status !== 'CHECKED_IN') {
      throw new HttpError(400, 'Room services can only be requested for checked-in bookings')
    }
    const existingInvoice = store.invoices.find((i) => i.bookingId === bookingId)
    if (existingInvoice && existingInvoice.status !== 'DRAFT') {
      throw new HttpError(409, 'Service usage cannot be changed after the invoice is issued')
    }
    const body = req.body ?? {}
    const bookingRoomId = Number(body.bookingRoomId)
    const serviceItemId = Number(body.serviceItemId)
    const quantity = Number(body.quantity)
    const detail = store.bookingDetails.find((d) => d.id === bookingRoomId && d.bookingId === bookingId)
    if (!detail) throw new HttpError(400, 'Booking room does not belong to this booking')
    const svc = store.serviceItems.find((s) => s.id === serviceItemId)
    if (!svc) throw new HttpError(404, 'Service not found')
    if (!svc.active) throw new HttpError(400, 'Service is not currently available')
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, 'Quantity must be greater than zero')
    }
    const order = {
      id: store.allocateId('order'),
      bookingId,
      bookingDetailId: detail.id,
      serviceItemId: svc.id,
      quantity,
      unitPrice: svc.unitPrice,
      approvalStatus: 'APPROVED' as const,
      cancelled: false,
      orderedAt: new Date().toISOString(),
      cancelledAt: null,
      cancellationReason: null,
    }
    store.serviceOrders.push(order)
    store.refreshDraftInvoiceIfPresent(bookingId)
    res.status(201).json(ok(store.toServiceUsageResponse(order), 'Service usage recorded'))
  })

  api.patch('/reception/service-usages/:usageId/approve', staffGuard, (req, res) => {
    const usageId = paramInt(req.params.usageId, 'usage ID')
    const order = store.serviceOrders.find((o) => o.id === usageId)
    if (!order) throw new HttpError(404, 'Service usage not found')
    if (order.approvalStatus !== 'PENDING') {
      throw new HttpError(409, 'Only pending service requests can be approved')
    }
    order.approvalStatus = 'APPROVED'
    store.refreshDraftInvoiceIfPresent(order.bookingId)
    res.json(ok(store.toServiceUsageResponse(order), 'Đã duyệt yêu cầu dịch vụ'))
  })

  api.patch('/reception/service-usages/:usageId/reject', staffGuard, (req, res) => {
    const usageId = paramInt(req.params.usageId, 'usage ID')
    const order = store.serviceOrders.find((o) => o.id === usageId)
    if (!order) throw new HttpError(404, 'Service usage not found')
    if (order.approvalStatus !== 'PENDING') {
      throw new HttpError(409, 'Only pending service requests can be rejected')
    }
    order.approvalStatus = 'REJECTED'
    res.json(ok(store.toServiceUsageResponse(order), 'Đã từ chối yêu cầu dịch vụ'))
  })

  api.patch('/reception/service-usages/:usageId/cancel', staffGuard, (req, res) => {
    const usageId = paramInt(req.params.usageId, 'usage ID')
    const order = store.serviceOrders.find((o) => o.id === usageId)
    if (!order) throw new HttpError(404, 'Service usage not found')
    if (order.cancelled) throw new HttpError(409, 'Service usage is already cancelled')
    if (order.approvalStatus !== 'APPROVED') {
      throw new HttpError(409, 'Only approved service usage can be cancelled')
    }
    const existingInvoice = store.invoices.find((i) => i.bookingId === order.bookingId)
    if (existingInvoice && existingInvoice.status !== 'DRAFT') {
      throw new HttpError(409, 'Service usage cannot be changed after the invoice is issued')
    }
    order.cancelled = true
    order.cancelledAt = new Date().toISOString()
    order.cancellationReason = req.body?.reason ? String(req.body.reason).trim() || null : null
    store.refreshDraftInvoiceIfPresent(order.bookingId)
    res.json(ok(store.toServiceUsageResponse(order), 'Service usage cancelled'))
  })

  // ---------------- INVOICES & PAYMENTS ----------------
  api.post('/reception/bookings/:bookingId/invoice', staffGuard, (req, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const surcharge = Number(req.body?.surcharge ?? 0)
    const discount = Number(req.body?.discount ?? 0)
    const invoice = store.createOrUpdateDraftInvoice(bookingId, surcharge, discount)
    res.json(ok(store.toInvoiceResponse(invoice), 'Invoice draft ready'))
  })

  api.put('/reception/invoices/:invoiceId/draft', staffGuard, (req, res) => {
    const invoiceId = paramInt(req.params.invoiceId, 'invoice ID')
    const current = store.invoices.find((i) => i.id === invoiceId)
    if (!current) throw new HttpError(404, 'Invoice not found')
    const surcharge = Number(req.body?.surcharge ?? 0)
    const discount = Number(req.body?.discount ?? 0)
    const updated = store.createOrUpdateDraftInvoice(current.bookingId, surcharge, discount)
    res.json(ok(store.toInvoiceResponse(updated), 'Draft updated'))
  })

  api.post('/reception/invoices/:invoiceId/issue', staffGuard, (req, res) => {
    const invoiceId = paramInt(req.params.invoiceId, 'invoice ID')
    const invoice = store.invoices.find((i) => i.id === invoiceId)
    if (!invoice) throw new HttpError(404, 'Invoice not found')
    if (
      store.serviceOrders.some(
        (o) => o.bookingId === invoice.bookingId && !o.cancelled && o.approvalStatus === 'PENDING',
      )
    ) {
      throw new HttpError(409, 'Pending service requests must be reviewed before issuing the invoice')
    }
    if (invoice.status !== 'DRAFT') throw new HttpError(409, 'Invoice is already issued')
    invoice.status = invoice.balanceDue === 0 ? 'PAID' : 'ISSUED'
    if (invoice.status === 'PAID') {
      invoice.isPaid = true
      invoice.paidAt = new Date().toISOString()
    }
    res.json(ok(store.toInvoiceResponse(invoice), 'Invoice issued'))
  })

  api.post('/reception/invoices/:invoiceId/payments', staffGuard, (req, res) => {
    const invoiceId = paramInt(req.params.invoiceId, 'invoice ID')
    const invoice = store.invoices.find((i) => i.id === invoiceId)
    if (!invoice) throw new HttpError(404, 'Invoice not found')
    const body = req.body ?? {}
    const idempotencyKey = String(body.idempotencyKey || '').trim()
    if (!idempotencyKey) throw new HttpError(400, 'Idempotency key is required')
    const amount = Math.round(Number(body.amount) * 100) / 100
    const method = String(body.method || 'CASH').toUpperCase() as PaymentMethod

    const previous = store.payments.find((p) => p.idempotencyKey === idempotencyKey)
    if (previous) {
      if (previous.invoiceId !== invoiceId || previous.amount !== amount || previous.method !== method) {
        throw new HttpError(409, 'Idempotency key was already used for a different payment')
      }
      return res.json(ok(previous, 'Payment recorded'))
    }

    if (invoice.status !== 'ISSUED') {
      throw new HttpError(400, 'Payments require an issued invoice with a balance due')
    }
    if (method !== 'CASH' && method !== 'BANK_TRANSFER') {
      throw new HttpError(400, 'Only CASH and manually confirmed BANK_TRANSFER payments are supported')
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, 'Payment amount must be greater than zero')
    }
    if (amount > invoice.balanceDue) {
      throw new HttpError(400, 'Payment cannot exceed the balance due')
    }

    const nowIso = new Date().toISOString()
    const payment = {
      id: store.allocateId('payment'),
      bookingId: null,
      invoiceId,
      type: 'BALANCE' as const,
      amount,
      method,
      status: 'SUCCESSFUL' as const,
      idempotencyKey,
      reference: body.reference ? String(body.reference).trim() || null : null,
      confirmedTransactionReference: null,
      confirmedBy: null,
      reportedAt: null,
      paidAt: nowIso,
      createdAt: nowIso,
    }
    store.payments.push(payment)
    invoice.successfulPayments = Math.round((invoice.successfulPayments + amount) * 100) / 100
    invoice.balanceDue = Math.max(0, Math.round((invoice.totalAmount - invoice.successfulPayments) * 100) / 100)
    invoice.paymentMethod = method
    if (invoice.balanceDue === 0) {
      invoice.status = 'PAID'
      invoice.isPaid = true
      invoice.paidAt = nowIso
    }
    res.json(ok(payment, 'Payment recorded'))
  })

  // ---------------- RECEPTION DEPOSIT VERIFICATION ----------------
  api.get('/reception/deposits/pending', staffGuard, (_req, res) => {
    store.expireStaleBookings()
    const list = store.bookings
      .filter((b) => b.status === 'PENDING_VERIFICATION')
      .sort((a, b) => (a.depositReportedAt || '').localeCompare(b.depositReportedAt || ''))
      .map((b) => store.toBookingResponse(b))
    res.json(ok(list))
  })

  api.post('/reception/deposits/:bookingId/confirm', staffGuard, (req: AuthedRequest, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    const payment = [...store.payments]
      .reverse()
      .find((p) => p.bookingId === bookingId && p.type === 'DEPOSIT')
    if (!payment) throw new HttpError(400, 'Deposit payment was not reported')
    if (booking.status !== 'PENDING_VERIFICATION' || payment.status !== 'REPORTED') {
      throw new HttpError(409, 'Deposit is not awaiting verification')
    }
    if (!booking.verificationDeadline || Date.now() >= Date.parse(booking.verificationDeadline)) {
      throw new HttpError(400, 'Verification window has expired')
    }
    const receivedAmount = Number(req.body?.actualReceivedAmount)
    const reference = String(req.body?.transactionReference || '').trim()
    if (!Number.isFinite(receivedAmount) || receivedAmount !== booking.depositAmount) {
      throw new HttpError(400, 'Received amount must exactly match the deposit amount')
    }
    if (!reference || reference.length > 255) {
      throw new HttpError(400, 'A valid bank transaction reference is required')
    }
    if (
      store.payments.some(
        (p) => p.method === 'BANK_TRANSFER' && p.reference === reference && p.status === 'SUCCESSFUL',
      )
    ) {
      throw new HttpError(409, 'This bank transaction reference has already been used')
    }

    const nowIso = new Date().toISOString()
    payment.status = 'SUCCESSFUL'
    payment.reference = reference
    payment.confirmedTransactionReference = reference
    payment.confirmedBy = req.authUser!.username
    payment.paidAt = nowIso
    booking.depositPaidAt = nowIso
    booking.depositConfirmedBy = req.authUser!.username
    booking.status = 'CONFIRMED'
    booking.confirmedAt = nowIso
    res.json(
      ok({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        deadline: booking.depositDeadline,
        paymentId: payment.id,
        paymentStatus: payment.status,
        reportedAt: booking.depositReportedAt,
        verificationDeadline: booking.verificationDeadline,
      }),
    )
  })

  api.post('/reception/deposits/:bookingId/reject', staffGuard, (req: AuthedRequest, res) => {
    const bookingId = paramInt(req.params.bookingId, 'booking ID')
    const booking = store.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    const payment = [...store.payments]
      .reverse()
      .find((p) => p.bookingId === bookingId && p.type === 'DEPOSIT')
    if (!payment) throw new HttpError(400, 'Deposit payment was not reported')
    if (booking.status !== 'PENDING_VERIFICATION' || payment.status !== 'REPORTED') {
      throw new HttpError(409, 'Deposit is not awaiting verification')
    }
    payment.status = 'FAILED'
    booking.status = 'EXPIRED'
    booking.expiredAt = new Date().toISOString()
    booking.rejectionReason = `Deposit not verified by ${req.authUser!.username}`
    res.json(
      ok({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: booking.depositAmount,
        deadline: booking.depositDeadline,
        paymentId: payment.id,
        paymentStatus: payment.status,
        reportedAt: booking.depositReportedAt,
        verificationDeadline: booking.verificationDeadline,
      }),
    )
  })

  api.get('/reception/refunds', staffGuard, (_req, res) => {
    res.json(ok(store.refunds.filter((r) => r.status === 'PENDING')))
  })

  api.post('/reception/refunds/:id/process', staffGuard, (req, res) => {
    const id = paramInt(req.params.id, 'refund ID')
    const refund = store.refunds.find((r) => r.id === id)
    if (!refund) throw new HttpError(404, 'Refund not found')
    if (refund.status !== 'PENDING') throw new HttpError(400, 'Refund is already processed')
    const reference = String(req.body?.reference || '').trim()
    if (!reference) throw new HttpError(400, 'Reference is required')
    refund.status = 'COMPLETED'
    refund.reference = reference
    refund.completedAt = new Date().toISOString()
    res.json(ok(refund))
  })

  // ---------------- ADMIN OPERATIONS ----------------
  const adminGuard = requireRoles('ROLE_ADMIN')

  api.get('/admin/employees', adminGuard, (_req, res) => {
    const employees = store.users
      .filter((u) => u.role === 'ROLE_ADMIN' || u.role === 'ROLE_RECEPTIONIST')
      .map((u) => store.toEmployeeResponse(u))
    res.json(ok(employees))
  })

  api.post('/admin/employees/receptionists', adminGuard, (req, res) => {
    const body = req.body ?? {}
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const employeeCode = String(body.employeeCode || '').trim()
    if (username.length < 4 || username.length > 50) throw new HttpError(400, 'Invalid username')
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters')
    if (!fullName || !email || !employeeCode) throw new HttpError(400, 'Missing required employee fields')
    if (store.users.some((u) => u.username === username)) throw new HttpError(409, 'Username is already in use')
    if (store.users.some((u) => u.email.toLowerCase() === email)) throw new HttpError(409, 'Email is already in use')
    if (store.users.some((u) => u.employeeCode?.toLowerCase() === employeeCode.toLowerCase())) {
      throw new HttpError(409, 'Employee code is already in use')
    }

    const employee: UserEntity = {
      id: store.allocateId('user'),
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      fullName,
      email,
      phone: body.phone ? String(body.phone).trim() || null : null,
      role: 'ROLE_RECEPTIONIST',
      accountStatus: 'ACTIVE',
      employeeCode,
      salary: body.salary != null ? Number(body.salary) : null,
      hireDate: body.hireDate ? String(body.hireDate) : todayIsoDate(),
      deskNumber: body.deskNumber != null ? Number(body.deskNumber) : 0,
      createdAt: new Date().toISOString(),
    }
    store.users.push(employee)
    res.json(ok(store.toEmployeeResponse(employee), 'Đã tạo tài khoản lễ tân.'))
  })

  api.patch('/admin/employees/:id/active', adminGuard, (req, res) => {
    const id = paramInt(req.params.id, 'employee ID')
    const active = String(req.query.active) === 'true'
    const emp = store.users.find(
      (u) => u.id === id && (u.role === 'ROLE_ADMIN' || u.role === 'ROLE_RECEPTIONIST'),
    )
    if (!emp) throw new HttpError(404, 'Employee account not found')
    emp.accountStatus = active ? 'ACTIVE' : 'LOCKED'
    res.json(
      ok(store.toEmployeeResponse(emp), active ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.'),
    )
  })

  api.get('/admin/pricing', adminGuard, (_req, res) => {
    const list = Object.entries(PRICING_DEFAULTS).map(([strategy, defaultMultiplier]) => ({
      strategy,
      multiplier: store.pricingRates[strategy] ?? defaultMultiplier,
      defaultMultiplier,
    }))
    res.json(ok(list))
  })

  api.get('/admin/pricing/history', adminGuard, (_req, res) => {
    const now = new Date()
    const seasonalProfiles: Record<number, { factor: number; occupancy: number; context: string }> = {
      1: { factor: 1.14, occupancy: 84, context: 'Đầu năm & du xuân' },
      2: { factor: 1.18, occupancy: 88, context: 'Cao điểm Tết & lễ hội' },
      3: { factor: 1.02, occupancy: 68, context: 'Sau Tết, khách công tác' },
      4: { factor: 1.06, occupancy: 74, context: 'Nghỉ lễ 30/4 - 1/5' },
      5: { factor: 1.04, occupancy: 71, context: 'Đầu hè & hội nghị' },
      6: { factor: 1.12, occupancy: 82, context: 'Cao điểm du lịch hè' },
      7: { factor: 1.15, occupancy: 86, context: 'Đỉnh điểm mùa hè' },
      8: { factor: 1.08, occupancy: 78, context: 'Cuối hè & gia đình' },
      9: { factor: 0.96, occupancy: 63, context: 'Giao mùa thu, giá ưu đãi' },
      10: { factor: 1.09, occupancy: 79, context: 'Mùa thu Hà Nội' },
      11: { factor: 1.03, occupancy: 73, context: 'Cuối thu & sự kiện' },
      12: { factor: 1.17, occupancy: 89, context: 'Lễ hội cuối năm' },
    }

    const stdRate = store.pricingRates.STANDARD ?? PRICING_DEFAULTS.STANDARD
    const wkndRate = store.pricingRates.WEEKEND ?? PRICING_DEFAULTS.WEEKEND
    const holRate = store.pricingRates.HOLIDAY ?? PRICING_DEFAULTS.HOLIDAY
    const currentBlendedMultiplier = (stdRate * 20 + wkndRate * 8 + holRate * 2) / 30

    const monthsMeta = Array.from({ length: 6 }, (_, i) => {
      const offset = 5 - i
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
      const year = d.getUTCFullYear()
      const monthNumber = d.getUTCMonth() + 1
      const isoMonth = `${year}-${String(monthNumber).padStart(2, '0')}`
      return {
        offset,
        year,
        monthNumber,
        month: isoMonth,
        label: `Th${monthNumber}/${year}`,
        shortLabel: `Th${monthNumber}`,
        profile: seasonalProfiles[monthNumber] ?? { factor: 1, occupancy: 70, context: 'Mùa tiêu chuẩn' },
      }
    })

    const months = monthsMeta.map((m) => {
      const prices: Record<string, number> = {}
      let priceSum = 0

      for (const rt of store.roomTypes) {
        const tierSensitivity =
          rt.basePrice >= 3_000_000 ? 1.18 : rt.basePrice >= 1_400_000 ? 1.08 : 0.96
        const seasonalDelta = (m.profile.factor - 1) * tierSensitivity
        const seasonalMultiplier = 1 + seasonalDelta

        // Inspect actual bookings in this month for this room type if present
        const monthBookingPrices = store.bookings
          .filter(
            (b) =>
              b.status !== 'CANCELLED' &&
              b.status !== 'REJECTED' &&
              b.status !== 'EXPIRED' &&
              b.checkInDate.startsWith(m.month),
          )
          .flatMap((b) => store.bookingDetails.filter((d) => d.bookingId === b.id))
          .filter((d) => {
            const room = store.rooms.find((r) => r.id === d.roomId)
            return room?.roomTypeId === rt.id
          })
          .map((d) => d.pricePerNight)

        let effectivePrice: number
        if (m.offset === 0) {
          // Current month reflects active pricing strategy multipliers immediately
          const liveEstimate = rt.basePrice * currentBlendedMultiplier * (1 + seasonalDelta * 0.35)
          if (monthBookingPrices.length > 0) {
            const avgActual =
              monthBookingPrices.reduce((sum, p) => sum + p, 0) / monthBookingPrices.length
            effectivePrice = liveEstimate * 0.75 + avgActual * 0.25
          } else {
            effectivePrice = liveEstimate
          }
        } else {
          const historicalEstimate = rt.basePrice * seasonalMultiplier
          if (monthBookingPrices.length > 0) {
            const avgActual =
              monthBookingPrices.reduce((sum, p) => sum + p, 0) / monthBookingPrices.length
            effectivePrice = historicalEstimate * 0.7 + avgActual * 0.3
          } else {
            effectivePrice = historicalEstimate
          }
        }

        const rounded = Math.round(effectivePrice / 1000) * 1000
        prices[String(rt.id)] = rounded
        priceSum += rounded
      }

      const averagePrice =
        store.roomTypes.length > 0 ? Math.round(priceSum / store.roomTypes.length / 1000) * 1000 : 0

      return {
        month: m.month,
        label: m.label,
        shortLabel: m.shortLabel,
        seasonalContext: m.offset === 0 ? `${m.profile.context} (Hiện tại)` : m.profile.context,
        occupancyRate: m.profile.occupancy,
        averagePrice,
        prices,
      }
    })

    const roomTypes = store.roomTypes.map((rt) => {
      const series = months.map((m) => m.prices[String(rt.id)] ?? rt.basePrice)
      const first = series[0] ?? rt.basePrice
      const current = series[series.length - 1] ?? rt.basePrice
      const minPrice = Math.min(...series)
      const maxPrice = Math.max(...series)
      const changePercent =
        first > 0 ? Math.round(((current - first) / first) * 1000) / 10 : 0
      return {
        id: rt.id,
        name: rt.name,
        basePrice: rt.basePrice,
        currentPrice: current,
        minPrice,
        maxPrice,
        changePercent,
      }
    })

    res.json(
      ok({
        months,
        roomTypes,
        blendedMultiplier: Math.round(currentBlendedMultiplier * 100) / 100,
      }),
    )
  })

  api.put('/admin/pricing/:strategy', adminGuard, (req, res) => {
    const strategy = paramStr(req.params.strategy).toUpperCase()
    const defaultMultiplier = PRICING_DEFAULTS[strategy as keyof typeof PRICING_DEFAULTS]
    if (defaultMultiplier == null) throw new HttpError(404, 'Pricing strategy not found')
    const multiplier = Number(req.body?.multiplier)
    if (!Number.isFinite(multiplier) || multiplier < 0.1 || multiplier > 10) {
      throw new HttpError(400, 'Multiplier must be between 0.1 and 10')
    }
    store.pricingRates[strategy] = multiplier
    res.json(
      ok({ strategy, multiplier, defaultMultiplier }, 'Đã cập nhật hệ số giá.'),
    )
  })

  return api
}

async function startServer() {
  const app = express()
  app.use(cors())
  app.use(express.json({ strict: false }))

  app.use('/api', buildApiRouter())

  // API error handler
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json(fail(err.message, err.data))
    }
    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
      return res.status(400).json(fail('Invalid request body'))
    }
    console.error('[API Error]', err)
    res.status(500).json(fail('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'))
  })

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR)
  if (isProd) {
    app.use(express.static(DIST_DIR))
    app.use((_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'))
    })
  } else {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        root: FRONTEND_DIR,
        configFile: path.resolve(FRONTEND_DIR, 'vite.config.ts'),
        server: { middlewareMode: true, hmr: false, host: '0.0.0.0', allowedHosts: true },
        appType: 'spa',
      }),
    )
    vitePromise.catch((err) => {
      console.error('Failed to initialize Vite dev middleware:', err)
      process.exit(1)
    })
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise
        vite.middlewares(req, res, next)
      } catch (err) {
        next(err)
      }
    })
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hoang Gia Hotel server listening on http://0.0.0.0:${PORT}`)
  })

  const shutdown = () => {
    server.close(() => process.exit(0))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
