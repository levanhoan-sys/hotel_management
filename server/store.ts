import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type RoleName = 'ROLE_CUSTOMER' | 'ROLE_RECEPTIONIST' | 'ROLE_ADMIN'
export type AccountStatus = 'ACTIVE' | 'LOCKED'
export type RoomStatus = 'AVAILABLE' | 'BOOKED' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
export type BookingStatus =
  | 'PENDING_DEPOSIT'
  | 'PENDING_VERIFICATION'
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_SHOW'
export type ServiceOrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID'
export type InvoiceItemType = 'ROOM' | 'SERVICE' | 'SURCHARGE' | 'DISCOUNT'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'VNPAY'
export type PaymentStatus = 'PENDING' | 'REPORTED' | 'SUCCESSFUL' | 'FAILED'
export type PaymentType = 'DEPOSIT' | 'BALANCE'

export class HttpError extends Error {
  status: number
  data?: unknown
  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export interface UserEntity {
  id: number
  username: string
  passwordHash: string
  fullName: string
  email: string
  phone: string | null
  role: RoleName
  accountStatus: AccountStatus
  identityCard?: string | null
  address?: string | null
  loyaltyPoints?: number
  employeeCode?: string | null
  salary?: number | null
  hireDate?: string | null
  deskNumber?: number | null
  createdAt: string
}

export interface RoomTypeEntity {
  id: number
  name: string
  basePrice: number
  capacity: number
  description: string | null
  imageUrl: string | null
  imageUrls: string[]
  areaSqm: number | null
  amenities: string | null
}

export interface ServiceItemEntity {
  id: number
  name: string
  unitPrice: number
  unit: string
  active: boolean
}

export interface RoomEntity {
  id: number
  roomNumber: string
  floor: number
  status: RoomStatus
  operational: boolean
  roomTypeId: number
  serviceIds: number[]
  imageUrls: string[]
}

export interface RoomBlockEntity {
  id: number
  roomId: number
  startDate: string
  endDate: string
  reason: string
}

export interface BookingDetailEntity {
  id: number
  bookingId: number
  roomId: number
  pricePerNight: number
  guestCount: number
}

export interface ServiceOrderEntity {
  id: number
  bookingId: number
  bookingDetailId: number | null
  serviceItemId: number
  quantity: number
  unitPrice: number
  approvalStatus: ServiceOrderStatus
  cancelled: boolean
  orderedAt: string
  cancelledAt: string | null
  cancellationReason: string | null
}

export interface BookingEntity {
  id: number
  bookingCode: string
  customerId: number
  checkInDate: string
  checkOutDate: string
  status: BookingStatus
  depositAmount: number | null
  depositRate: number | null
  depositDeadline: string | null
  verificationDeadline: string | null
  depositReportedAt: string | null
  transferContent: string | null
  depositPaidAt: string | null
  depositConfirmedBy: string | null
  expiredAt: string | null
  confirmedAt: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancellationReason: string | null
  rejectionReason: string | null
  cancellationFreeHoursSnapshot: number | null
  cancellationPartialHoursSnapshot: number | null
  createdAt: string
}

export interface PaymentEntity {
  id: number
  bookingId: number | null
  invoiceId: number | null
  type: PaymentType
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  idempotencyKey: string
  reference: string | null
  confirmedTransactionReference: string | null
  confirmedBy: string | null
  reportedAt: string | null
  paidAt: string | null
  createdAt: string
}

export interface InvoiceItemEntity {
  id: number
  type: InvoiceItemType
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface InvoiceEntity {
  id: number
  bookingId: number
  roomAmount: number
  serviceAmount: number
  tax: number
  surcharge: number
  discount: number
  totalAmount: number
  successfulPayments: number
  balanceDue: number
  status: InvoiceStatus
  paymentMethod: PaymentMethod | null
  isPaid: boolean
  paidAt: string | null
  items: InvoiceItemEntity[]
}

export interface RefundEntity {
  id: number
  bookingId: number
  code: string
  amount: number
  status: 'PENDING' | 'COMPLETED'
  reference: string | null
  completedAt: string | null
  createdAt: string
}

export const BOOKING_CONFIG = {
  depositRate: 0.3,
  depositTimeoutMinutes: 15,
  checkInHour: 14,
  cancellationFreeHours: 72,
  cancellationPartialHours: 24,
}

export const PRICING_DEFAULTS: Record<'STANDARD' | 'WEEKEND' | 'HOLIDAY', number> = {
  STANDARD: 1.0,
  WEEKEND: 1.2,
  HOLIDAY: 1.5,
}

const BANK_CONFIG = {
  bin: process.env.HOTEL_BANK_BIN?.trim() || '970422',
  accountNumber: process.env.HOTEL_BANK_ACCOUNT?.trim() || '0123456789',
  accountName: process.env.HOTEL_BANK_ACCOUNT_NAME?.trim() || 'HOANG GIA HOTEL',
}

export function todayIsoDate(): string {
  const now = new Date()
  const local = new Date(now.getTime() + 7 * 3600_000)
  return local.toISOString().slice(0, 10)
}

export function addDaysIsoDate(baseDate: string, days: number): string {
  const dt = new Date(`${baseDate}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00Z`)
  const end = Date.parse(`${checkOut}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 86_400_000)
}

function roundMoney(value: number, scale = 0): number {
  const factor = Math.pow(10, scale)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export class HotelStore {
  users: UserEntity[] = []
  roomTypes: RoomTypeEntity[] = []
  serviceItems: ServiceItemEntity[] = []
  rooms: RoomEntity[] = []
  roomBlocks: RoomBlockEntity[] = []
  bookings: BookingEntity[] = []
  bookingDetails: BookingDetailEntity[] = []
  serviceOrders: ServiceOrderEntity[] = []
  payments: PaymentEntity[] = []
  invoices: InvoiceEntity[] = []
  refunds: RefundEntity[] = []
  pricingRates: Record<string, number> = { ...PRICING_DEFAULTS }

  private seq = {
    user: 1,
    roomType: 1,
    service: 1,
    room: 1,
    block: 1,
    booking: 1,
    detail: 1,
    order: 1,
    payment: 1,
    invoice: 1,
    invoiceItem: 1,
    refund: 1,
  }

  constructor() {
    this.seed()
  }

  private nextId(key: keyof typeof this.seq): number {
    return this.seq[key]++
  }

  private seed() {
    const today = todayIsoDate()
    const nowIso = new Date().toISOString()
    const demoPassHash = bcrypt.hashSync('123456', 10)

    // Users (demo.customer1, demo.customer2, demo.reception, demo.admin)
    this.users = [
      {
        id: this.nextId('user'),
        username: 'demo.customer1',
        passwordHash: demoPassHash,
        fullName: 'Demo Customer One',
        email: 'demo.customer1@hotel.local',
        phone: '0900000002',
        role: 'ROLE_CUSTOMER',
        accountStatus: 'ACTIVE',
        identityCard: 'DEMO-ID-0001',
        address: '1 Example Street, Ho Chi Minh City',
        loyaltyPoints: 120,
        createdAt: nowIso,
      },
      {
        id: this.nextId('user'),
        username: 'demo.customer2',
        passwordHash: demoPassHash,
        fullName: 'Demo Customer Two',
        email: 'demo.customer2@hotel.local',
        phone: '0900000003',
        role: 'ROLE_CUSTOMER',
        accountStatus: 'ACTIVE',
        identityCard: 'DEMO-ID-0002',
        address: '2 Example Street, Ho Chi Minh City',
        loyaltyPoints: 40,
        createdAt: nowIso,
      },
      {
        id: this.nextId('user'),
        username: 'demo.reception',
        passwordHash: demoPassHash,
        fullName: 'Demo Receptionist',
        email: 'demo.reception@hotel.local',
        phone: '0900000001',
        role: 'ROLE_RECEPTIONIST',
        accountStatus: 'ACTIVE',
        employeeCode: 'DEMO-FD-01',
        salary: 12000000,
        hireDate: today,
        deskNumber: 1,
        createdAt: nowIso,
      },
      {
        id: this.nextId('user'),
        username: 'demo.admin',
        passwordHash: demoPassHash,
        fullName: 'Quản trị viên',
        email: 'demo.admin@hotel.local',
        phone: '0900000000',
        role: 'ROLE_ADMIN',
        accountStatus: 'ACTIVE',
        employeeCode: 'ADMIN-01',
        salary: 25000000,
        hireDate: today,
        deskNumber: null,
        createdAt: nowIso,
      },
    ]

    const envRecepUser = process.env.APP_BOOTSTRAP_RECEPTIONIST_USERNAME?.trim()
    const envRecepPass = process.env.APP_BOOTSTRAP_RECEPTIONIST_PASSWORD
    if (envRecepUser && envRecepPass && !this.users.some((u) => u.username === envRecepUser)) {
      this.users.push({
        id: this.nextId('user'),
        username: envRecepUser,
        passwordHash: bcrypt.hashSync(envRecepPass, 10),
        fullName: 'Lễ tân',
        email: `${envRecepUser}@hotel.local`,
        phone: null,
        role: 'ROLE_RECEPTIONIST',
        accountStatus: 'ACTIVE',
        employeeCode: 'FRONTDESK-1',
        salary: null,
        hireDate: today,
        deskNumber: 1,
        createdAt: nowIso,
      })
    }

    const envAdminUser = process.env.APP_BOOTSTRAP_ADMIN_USERNAME?.trim()
    const envAdminPass = process.env.APP_BOOTSTRAP_ADMIN_PASSWORD
    if (envAdminUser && envAdminPass && !this.users.some((u) => u.username === envAdminUser)) {
      this.users.push({
        id: this.nextId('user'),
        username: envAdminUser,
        passwordHash: bcrypt.hashSync(envAdminPass, 10),
        fullName: 'Quản trị viên',
        email: `${envAdminUser}@hotel.local`,
        phone: null,
        role: 'ROLE_ADMIN',
        accountStatus: 'ACTIVE',
        employeeCode: `ADMIN-${envAdminUser}`.slice(0, 30),
        salary: null,
        hireDate: today,
        deskNumber: null,
        createdAt: nowIso,
      })
    }

    // Room Types, Galleries, Service Items & Rooms loaded from data.sql
    const sqlSeed = loadSeedFromDataSql()
    if (sqlSeed) {
      this.roomTypes = sqlSeed.roomTypes
      this.serviceItems = sqlSeed.serviceItems
      this.rooms = sqlSeed.rooms
      this.seq.roomType = Math.max(1, ...this.roomTypes.map((t) => t.id)) + 1
      this.seq.service = Math.max(1, ...this.serviceItems.map((s) => s.id)) + 1
      this.seq.room = Math.max(1, ...this.rooms.map((r) => r.id)) + 1
    } else {
      const singleImages = [
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=85',
      ]
      const doubleImages = [
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85',
      ]
      const deluxeImages = [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85',
      ]
      const vipImages = [
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85',
      ]
      this.roomTypes = [
        {
          id: this.nextId('roomType'),
          name: 'Standard Single',
          basePrice: 650000,
          capacity: 1,
          description: 'Phòng gọn gàng cho khách đi công tác tại Hà Đông.',
          imageUrl: singleImages[0],
          imageUrls: singleImages,
          areaSqm: 22,
          amenities: 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Bàn làm việc,Phòng tắm riêng',
        },
        {
          id: this.nextId('roomType'),
          name: 'Standard Double',
          basePrice: 890000,
          capacity: 2,
          description: 'Phòng giường đôi ấm áp cho hai khách.',
          imageUrl: doubleImages[0],
          imageUrls: doubleImages,
          areaSqm: 28,
          amenities: 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Ấm đun nước,Phòng tắm riêng',
        },
        {
          id: this.nextId('roomType'),
          name: 'Deluxe Suite',
          basePrice: 1650000,
          capacity: 4,
          description: 'Không gian rộng với góc tiếp khách và tầm nhìn thành phố.',
          imageUrl: deluxeImages[0],
          imageUrls: deluxeImages,
          areaSqm: 45,
          amenities: 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Góc tiếp khách,Bồn tắm',
        },
        {
          id: this.nextId('roomType'),
          name: 'Presidential VIP',
          basePrice: 3900000,
          capacity: 6,
          description: 'Căn suite cao cấp dành cho kỳ nghỉ gia đình tại Hà Nội.',
          imageUrl: vipImages[0],
          imageUrls: vipImages,
          areaSqm: 85,
          amenities: 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Phòng khách,Bồn tắm,Bàn ăn',
        },
      ]

      this.serviceItems = [
        { id: this.nextId('service'), name: 'Bữa sáng tại phòng', unitPrice: 180000, unit: 'suất', active: true },
        { id: this.nextId('service'), name: 'Giặt ủi', unitPrice: 70000, unit: 'kg', active: true },
        { id: this.nextId('service'), name: 'Nước giải khát minibar', unitPrice: 45000, unit: 'lon', active: true },
        { id: this.nextId('service'), name: 'Đưa đón sân bay', unitPrice: 450000, unit: 'chuyến', active: true },
        { id: this.nextId('service'), name: 'Massage tại phòng', unitPrice: 850000, unit: 'giờ', active: true },
        { id: this.nextId('service'), name: 'Gọi nhân viên hỗ trợ', unitPrice: 0, unit: 'lần', active: true },
        { id: this.nextId('service'), name: 'Bữa trưa tại phòng', unitPrice: 220000, unit: 'suất', active: true },
        { id: this.nextId('service'), name: 'Bữa tối tại phòng', unitPrice: 280000, unit: 'suất', active: true },
      ]

      const baseServices = [1, 2, 3, 6, 7, 8]
      const vipServices = [1, 2, 3, 4, 5, 6, 7, 8]
      const vipRooms = new Set([5, 6, 9, 10, 11, 12])

      const roomSeeds: Array<[string, number, number, RoomStatus]> = [
        ['101', 1, 1, 'AVAILABLE'],
        ['102', 1, 1, 'AVAILABLE'],
        ['201', 2, 2, 'OCCUPIED'],
        ['202', 2, 2, 'AVAILABLE'],
        ['301', 3, 3, 'AVAILABLE'],
        ['401', 4, 4, 'AVAILABLE'],
        ['103', 1, 2, 'AVAILABLE'],
        ['203', 2, 2, 'AVAILABLE'],
        ['302', 3, 3, 'AVAILABLE'],
        ['402', 4, 4, 'AVAILABLE'],
        ['501', 5, 3, 'AVAILABLE'],
        ['601', 6, 4, 'AVAILABLE'],
      ]

      for (const [roomNumber, floor, roomTypeId, status] of roomSeeds) {
        const id = this.nextId('room')
        const rt = this.roomTypes.find((t) => t.id === roomTypeId)
        this.rooms.push({
          id,
          roomNumber,
          floor,
          roomTypeId,
          status,
          operational: true,
          serviceIds: vipRooms.has(id) ? [...vipServices] : [...baseServices],
          imageUrls: rt ? [...rt.imageUrls] : [],
        })
      }
    }

    // Bookings from data-dev.sql
    const c1 = 1
    const c2 = 2
    const seedBookings: Array<{
      code: string
      customerId: number
      checkIn: string
      checkOut: string
      status: BookingStatus
      rooms: Array<{ roomId: number; price: number; guests: number }>
      confirmedAt?: string | null
      checkedInAt?: string | null
      checkedOutAt?: string | null
      cancelledAt?: string | null
      cancelledBy?: string | null
      cancellationReason?: string | null
      rejectionReason?: string | null
    }> = [
      {
        code: 'DEMO-BK-PENDING',
        customerId: c1,
        checkIn: addDaysIsoDate(today, 2),
        checkOut: addDaysIsoDate(today, 4),
        status: 'PENDING',
        rooms: [{ roomId: 1, price: 650000, guests: 1 }],
      },
      {
        code: 'DEMO-BK-CONFIRMED',
        customerId: c1,
        checkIn: addDaysIsoDate(today, 7),
        checkOut: addDaysIsoDate(today, 9),
        status: 'CONFIRMED',
        confirmedAt: nowIso,
        rooms: [{ roomId: 2, price: 650000, guests: 1 }],
      },
      {
        code: 'DEMO-BK-CHECKED-IN',
        customerId: c2,
        checkIn: today,
        checkOut: addDaysIsoDate(today, 2),
        status: 'CHECKED_IN',
        confirmedAt: nowIso,
        checkedInAt: nowIso,
        rooms: [{ roomId: 3, price: 890000, guests: 2 }],
      },
      {
        code: 'DEMO-BK-COMPLETED',
        customerId: c1,
        checkIn: addDaysIsoDate(today, -10),
        checkOut: addDaysIsoDate(today, -8),
        status: 'COMPLETED',
        confirmedAt: addDaysIsoDate(today, -10) + 'T10:00:00.000Z',
        checkedInAt: addDaysIsoDate(today, -10) + 'T14:00:00.000Z',
        checkedOutAt: addDaysIsoDate(today, -8) + 'T11:00:00.000Z',
        rooms: [{ roomId: 4, price: 890000, guests: 2 }],
      },
      {
        code: 'DEMO-BK-CANCELLED',
        customerId: c2,
        checkIn: addDaysIsoDate(today, 3),
        checkOut: addDaysIsoDate(today, 5),
        status: 'CANCELLED',
        cancelledAt: nowIso,
        cancelledBy: 'demo.customer2',
        cancellationReason: 'Seed example cancellation',
        rooms: [{ roomId: 5, price: 1650000, guests: 2 }],
      },
      {
        code: 'DEMO-BK-REJECTED',
        customerId: c1,
        checkIn: addDaysIsoDate(today, 4),
        checkOut: addDaysIsoDate(today, 5),
        status: 'REJECTED',
        rejectionReason: 'Seed example rejection',
        rooms: [{ roomId: 6, price: 3900000, guests: 4 }],
      },
      {
        code: 'DEMO-BK-MULTI-ROOM',
        customerId: c2,
        checkIn: addDaysIsoDate(today, 2),
        checkOut: addDaysIsoDate(today, 4),
        status: 'PENDING',
        rooms: [
          { roomId: 7, price: 890000, guests: 2 },
          { roomId: 8, price: 890000, guests: 1 },
        ],
      },
    ]

    for (const item of seedBookings) {
      const bookingId = this.nextId('booking')
      this.bookings.push({
        id: bookingId,
        bookingCode: item.code,
        customerId: item.customerId,
        checkInDate: item.checkIn,
        checkOutDate: item.checkOut,
        status: item.status,
        depositAmount: null,
        depositRate: null,
        depositDeadline: null,
        verificationDeadline: null,
        depositReportedAt: null,
        transferContent: null,
        depositPaidAt: null,
        depositConfirmedBy: null,
        expiredAt: null,
        confirmedAt: item.confirmedAt ?? null,
        checkedInAt: item.checkedInAt ?? null,
        checkedOutAt: item.checkedOutAt ?? null,
        cancelledAt: item.cancelledAt ?? null,
        cancelledBy: item.cancelledBy ?? null,
        cancellationReason: item.cancellationReason ?? null,
        rejectionReason: item.rejectionReason ?? null,
        cancellationFreeHoursSnapshot: null,
        cancellationPartialHoursSnapshot: null,
        createdAt: nowIso,
      })

      for (const rm of item.rooms) {
        this.bookingDetails.push({
          id: this.nextId('detail'),
          bookingId,
          roomId: rm.roomId,
          pricePerNight: rm.price,
          guestCount: rm.guests,
        })
      }

      if (item.code === 'DEMO-BK-COMPLETED') {
        const roomTotal = 890000 * 2
        const tax = roundMoney(roomTotal * 0.1, 2)
        const total = roomTotal + tax
        const invoiceId = this.nextId('invoice')
        const paidAt = addDaysIsoDate(today, -8) + 'T11:00:00.000Z'
        this.invoices.push({
          id: invoiceId,
          bookingId,
          roomAmount: roomTotal,
          serviceAmount: 0,
          tax,
          surcharge: 0,
          discount: 0,
          totalAmount: total,
          successfulPayments: total,
          balanceDue: 0,
          status: 'PAID',
          paymentMethod: 'CASH',
          isPaid: true,
          paidAt,
          items: [
            {
              id: this.nextId('invoiceItem'),
              type: 'ROOM',
              description: 'Room 202 for 2 night(s)',
              quantity: 2,
              unitPrice: 890000,
              lineTotal: roomTotal,
            },
            {
              id: this.nextId('invoiceItem'),
              type: 'SURCHARGE',
              description: 'Tax (10%)',
              quantity: 1,
              unitPrice: tax,
              lineTotal: tax,
            },
          ],
        })
        this.payments.push({
          id: this.nextId('payment'),
          bookingId: null,
          invoiceId,
          type: 'BALANCE',
          amount: total,
          method: 'CASH',
          status: 'SUCCESSFUL',
          idempotencyKey: 'seed-completed-payment',
          reference: 'Thu tiền mặt tại quầy',
          confirmedTransactionReference: null,
          confirmedBy: 'demo.reception',
          reportedAt: null,
          paidAt,
          createdAt: paidAt,
        })
      }
    }
  }

  // ---- Helper methods ----

  expireStaleBookings() {
    const nowMs = Date.now()
    for (const b of this.bookings) {
      if (b.status === 'PENDING_DEPOSIT' && b.depositDeadline && Date.parse(b.depositDeadline) <= nowMs) {
        b.status = 'EXPIRED'
        b.expiredAt = new Date().toISOString()
      } else if (
        b.status === 'PENDING_VERIFICATION' &&
        b.verificationDeadline &&
        Date.parse(b.verificationDeadline) <= nowMs
      ) {
        b.status = 'EXPIRED'
        b.expiredAt = new Date().toISOString()
      }
    }
  }

  isActiveBookingForHold(b: BookingEntity): boolean {
    const nowMs = Date.now()
    if (b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') return true
    if (b.status === 'PENDING_DEPOSIT') {
      return Boolean(b.depositDeadline && Date.parse(b.depositDeadline) > nowMs)
    }
    if (b.status === 'PENDING_VERIFICATION') {
      return Boolean(b.verificationDeadline && Date.parse(b.verificationDeadline) > nowMs)
    }
    return false
  }

  hasRoomBookingOverlap(roomId: number, startDate: string, endDate: string, excludeBookingId?: number): boolean {
    return this.bookingDetails.some((detail) => {
      if (detail.roomId !== roomId) return false
      if (excludeBookingId != null && detail.bookingId === excludeBookingId) return false
      const booking = this.bookings.find((b) => b.id === detail.bookingId)
      if (!booking || !this.isActiveBookingForHold(booking)) return false
      return booking.checkInDate < endDate && booking.checkOutDate > startDate
    })
  }

  hasRoomBlockOverlap(roomId: number, startDate: string, endDate: string): boolean {
    return this.roomBlocks.some(
      (block) => block.roomId === roomId && block.startDate < endDate && block.endDate > startDate,
    )
  }

  hasActiveOrFutureBooking(roomId: number, afterDate: string): boolean {
    return this.bookingDetails.some((detail) => {
      if (detail.roomId !== roomId) return false
      const booking = this.bookings.find((b) => b.id === detail.bookingId)
      if (!booking || !this.isActiveBookingForHold(booking)) return false
      return booking.checkOutDate > afterDate
    })
  }

  toRoomResponse(room: RoomEntity) {
    const rt = this.roomTypes.find((t) => t.id === room.roomTypeId)
    const services = room.serviceIds
      .map((id) => this.serviceItems.find((s) => s.id === id))
      .filter((s): s is ServiceItemEntity => Boolean(s && s.active))
      .map((s) => ({ ...s }))
    const imageUrls = room.imageUrls?.length
      ? [...room.imageUrls]
      : rt?.imageUrls?.length
        ? [...rt.imageUrls]
        : rt?.imageUrl
          ? [rt.imageUrl]
          : []
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      status: room.status,
      operational: room.operational,
      roomTypeName: rt?.name ?? null,
      basePrice: rt?.basePrice ?? 0,
      capacity: rt?.capacity ?? 0,
      description: rt?.description ?? null,
      imageUrl: imageUrls[0] ?? rt?.imageUrl ?? null,
      imageUrls,
      areaSqm: rt?.areaSqm ?? null,
      amenities: rt?.amenities ?? null,
      services,
    }
  }

  toBookingResponse(booking: BookingEntity) {
    const customer = this.users.find((u) => u.id === booking.customerId)
    const details = this.bookingDetails.filter((d) => d.bookingId === booking.id)
    const nights = nightsBetween(booking.checkInDate, booking.checkOutDate)

    const roomNumbers: string[] = []
    const roomImageUrls: (string | null)[] = []
    const rooms = details.map((d) => {
      const room = this.rooms.find((r) => r.id === d.roomId)
      const rt = room ? this.roomTypes.find((t) => t.id === room.roomTypeId) : undefined
      const roomNumber = room?.roomNumber ?? ''
      roomNumbers.push(roomNumber)
      roomImageUrls.push(room?.imageUrls?.[0] ?? rt?.imageUrl ?? rt?.imageUrls?.[0] ?? null)
      return {
        roomId: d.roomId,
        roomNumber,
        guestCount: d.guestCount,
        capacity: rt?.capacity ?? 0,
        pricePerNight: d.pricePerNight,
        bookingRoomId: d.id,
      }
    })

    const orders = this.serviceOrders
      .filter((o) => o.bookingId === booking.id)
      .map((o) => {
        const svc = this.serviceItems.find((s) => s.id === o.serviceItemId)
        const detail = o.bookingDetailId ? details.find((d) => d.id === o.bookingDetailId) : undefined
        const room = detail ? this.rooms.find((r) => r.id === detail.roomId) : undefined
        return {
          name: svc?.name ?? '',
          quantity: o.quantity,
          unit: svc?.unit ?? '',
          subTotal: o.unitPrice * o.quantity,
          id: o.id,
          bookingRoomId: o.bookingDetailId,
          roomNumber: room?.roomNumber ?? null,
          unitPrice: o.unitPrice,
          approvalStatus: o.approvalStatus,
          cancelled: o.cancelled,
          orderedAt: o.orderedAt,
          cancelledAt: o.cancelledAt,
          cancellationReason: o.cancellationReason,
        }
      })

    const totalRoomCharge = details.reduce((sum, d) => sum + d.pricePerNight * nights, 0)
    const totalServiceCharge = orders
      .filter((o) => !o.cancelled && o.approvalStatus === 'APPROVED')
      .reduce((sum, o) => sum + o.subTotal, 0)

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerId: booking.customerId,
      customerName: customer?.fullName ?? '',
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfNights: nights,
      status: booking.status,
      depositAmount: booking.depositAmount,
      depositRate: booking.depositRate,
      depositDeadline: booking.depositDeadline,
      verificationDeadline: booking.verificationDeadline,
      depositReportedAt: booking.depositReportedAt,
      transferContent: booking.transferContent,
      depositPaidAt: booking.depositPaidAt,
      expiredAt: booking.expiredAt,
      confirmedAt: booking.confirmedAt,
      checkedInAt: booking.checkedInAt,
      checkedOutAt: booking.checkedOutAt,
      roomNumbers,
      rooms,
      roomImageUrls,
      serviceOrders: orders,
      totalRoomCharge,
      totalServiceCharge,
      estimatedTotal: totalRoomCharge + totalServiceCharge,
      cancelledAt: booking.cancelledAt,
      cancelledBy: booking.cancelledBy,
      cancellationReason: booking.cancellationReason,
      rejectionReason: booking.rejectionReason,
    }
  }

  toInvoiceResponse(invoice: InvoiceEntity) {
    const booking = this.bookings.find((b) => b.id === invoice.bookingId)
    const customer = booking ? this.users.find((u) => u.id === booking.customerId) : undefined
    const invPayments = this.payments
      .filter((p) => p.invoiceId === invoice.id)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        reference: p.reference,
        paidAt: p.paidAt,
      }))

    return {
      id: invoice.id,
      bookingId: invoice.bookingId,
      customerName: customer?.fullName ?? '',
      roomAmount: invoice.roomAmount,
      serviceAmount: invoice.serviceAmount,
      tax: invoice.tax,
      surcharge: invoice.surcharge,
      discount: invoice.discount,
      totalAmount: invoice.totalAmount,
      successfulPayments: invoice.successfulPayments,
      balanceDue: invoice.balanceDue,
      depositPaid: booking?.depositPaidAt ? (booking.depositAmount ?? 0) : 0,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      isPaid: invoice.isPaid,
      paidAt: invoice.paidAt,
      items: invoice.items,
      payments: invPayments,
    }
  }

  toServiceUsageResponse(order: ServiceOrderEntity) {
    const booking = this.bookings.find((b) => b.id === order.bookingId)
    const customer = booking ? this.users.find((u) => u.id === booking.customerId) : undefined
    const detail = order.bookingDetailId
      ? this.bookingDetails.find((d) => d.id === order.bookingDetailId)
      : undefined
    const room = detail ? this.rooms.find((r) => r.id === detail.roomId) : undefined
    const svc = this.serviceItems.find((s) => s.id === order.serviceItemId)
    return {
      id: order.id,
      bookingId: order.bookingId,
      bookingCode: booking?.bookingCode ?? '',
      customerName: customer?.fullName ?? '',
      bookingRoomId: order.bookingDetailId,
      roomNumber: room?.roomNumber ?? null,
      serviceId: order.serviceItemId,
      serviceName: svc?.name ?? '',
      quantity: order.quantity,
      unit: svc?.unit ?? '',
      unitPrice: order.unitPrice,
      subTotal: order.unitPrice * order.quantity,
      orderedAt: order.orderedAt,
      approvalStatus: order.approvalStatus,
      cancelled: order.cancelled,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
    }
  }

  toEmployeeResponse(u: UserEntity) {
    return {
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      employeeCode: u.employeeCode ?? '',
      salary: u.salary ?? null,
      hireDate: u.hireDate ?? todayIsoDate(),
      deskNumber: u.role === 'ROLE_RECEPTIONIST' ? (u.deskNumber ?? 1) : null,
      role: u.role,
      accountStatus: u.accountStatus,
    }
  }

  searchRooms(filters: {
    checkIn?: string
    checkOut?: string
    roomTypeId?: number
    minCapacity?: number
    minPrice?: number
    maxPrice?: number
  }): RoomEntity[] {
    this.expireStaleBookings()
    const today = todayIsoDate()
    const { checkIn, checkOut, roomTypeId, minCapacity, minPrice, maxPrice } = filters
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      throw new HttpError(400, 'Both check-in and check-out dates are required')
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      throw new HttpError(400, 'Check-out date must be after check-in date')
    }
    if (minCapacity != null && minCapacity < 1) {
      throw new HttpError(400, 'Minimum capacity must be at least 1')
    }
    if ((minPrice != null && minPrice < 0) || (maxPrice != null && maxPrice < 0)) {
      throw new HttpError(400, 'Price filters cannot be negative')
    }
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      throw new HttpError(400, 'Minimum price cannot exceed maximum price')
    }

    return this.rooms
      .filter((r) => {
        if (!r.operational) return false
        if (checkIn && checkOut) {
          const statusOk =
            r.status === 'AVAILABLE' ||
            (checkIn > today && (r.status === 'OCCUPIED' || r.status === 'CLEANING'))
          if (!statusOk) return false
          if (this.hasRoomBookingOverlap(r.id, checkIn, checkOut)) return false
          if (this.hasRoomBlockOverlap(r.id, checkIn, checkOut)) return false
        }
        const rt = this.roomTypes.find((t) => t.id === r.roomTypeId)
        if (!rt) return false
        if (roomTypeId != null && rt.id !== roomTypeId) return false
        if (minCapacity != null && rt.capacity < minCapacity) return false
        if (minPrice != null && rt.basePrice < minPrice) return false
        if (maxPrice != null && rt.basePrice > maxPrice) return false
        return true
      })
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
  }

  recommendRooms(params: {
    referenceRoomId?: number
    roomTypeId?: number
    checkIn?: string
    checkOut?: string
    guests?: number
    roomQuantity?: number
    alternatives?: boolean
    limit?: number
  }) {
    const { referenceRoomId, roomTypeId, checkIn, checkOut, guests, roomQuantity, alternatives, limit } = params
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      throw new HttpError(400, 'Both check-in and check-out dates are required')
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      throw new HttpError(400, 'Check-out date must be after check-in date')
    }
    if (guests != null && guests < 1) throw new HttpError(400, 'Guest count must be at least 1')
    if (roomQuantity != null && roomQuantity < 1) throw new HttpError(400, 'Room quantity must be at least 1')
    if (limit != null && (limit < 1 || limit > 12)) {
      throw new HttpError(400, 'Recommendation limit must be between 1 and 12')
    }

    const referenceRoom =
      referenceRoomId != null ? this.rooms.find((r) => r.id === referenceRoomId) : undefined
    if (referenceRoomId != null && !referenceRoom) {
      throw new HttpError(404, `Room not found with ID: ${referenceRoomId}`)
    }
    let refType = referenceRoom
      ? this.roomTypes.find((t) => t.id === referenceRoom.roomTypeId)
      : undefined
    if (!refType && roomTypeId != null) {
      refType = this.roomTypes.find((t) => t.id === roomTypeId)
      if (!refType) throw new HttpError(404, 'Room type not found')
    }
    if (roomTypeId != null && refType && refType.id !== roomTypeId) {
      throw new HttpError(400, 'Room and room type references do not match')
    }

    let inventory = this.searchRooms({ checkIn, checkOut, minCapacity: guests })
    if (!checkIn) {
      inventory = inventory.filter((r) => r.status === 'AVAILABLE')
    }
    const byType = new Map<number, RoomEntity[]>()
    for (const r of inventory) {
      if (referenceRoom && r.id === referenceRoom.id) continue
      const rt = this.roomTypes.find((t) => t.id === r.roomTypeId)
      if (!rt || (guests != null && rt.capacity < guests)) continue
      const list = byType.get(rt.id) ?? []
      list.push(r)
      byType.set(rt.id, list)
    }

    const required = roomQuantity ?? 1
    const tokens = (amenities?: string | null) =>
      new Set(
        (amenities || '')
          .toLowerCase()
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
      )

    const score = (ref: RoomTypeEntity | undefined, cand: RoomTypeEntity) => {
      if (!ref) return 100
      const priceSimilarity =
        1 - Math.min(1, Math.abs(ref.basePrice - cand.basePrice) / Math.max(ref.basePrice, 1))
      const capacitySimilarity =
        guests == null
          ? 1 - Math.min(1, Math.abs(ref.capacity - cand.capacity) / Math.max(ref.capacity, 1))
          : cand.capacity >= guests
            ? 1
            : 0
      const typeSimilarity = ref.id === cand.id ? 1 : 0
      const a = tokens(ref.amenities)
      const b = tokens(cand.amenities)
      const union = new Set([...a, ...b])
      const intersection = [...a].filter((x) => b.has(x))
      const amenitySimilarity = union.size === 0 ? 0.5 : intersection.length / union.size
      return Math.round(
        100 * (priceSimilarity * 0.4 + capacitySimilarity * 0.25 + typeSimilarity * 0.2 + amenitySimilarity * 0.15),
      )
    }

    return [...byType.values()]
      .filter((group) => group.length >= required)
      .map((group) => group[0])
      .filter((room) => !alternatives || !refType || room.roomTypeId !== refType.id)
      .map((room) => {
        const type = this.roomTypes.find((t) => t.id === room.roomTypeId)!
        const refPrice = refType ? refType.basePrice : type.basePrice
        return {
          room: this.toRoomResponse(room),
          score: score(refType, type),
          priceDifference: type.basePrice - refPrice,
          availableQuantity: checkIn ? (byType.get(type.id)?.length ?? 0) : null,
          availabilityChecked: Boolean(checkIn),
        }
      })
      .sort((a, b) => b.score - a.score || Math.abs(a.priceDifference) - Math.abs(b.priceDifference))
      .slice(0, limit ?? 4)
  }

  createBooking(
    params: {
      customerId: number
      checkInDate: string
      checkOutDate: string
      roomIds: number[]
      guestCounts?: Record<string, number>
      pricingType?: string
    },
    depositRequired: boolean,
  ) {
    this.expireStaleBookings()
    const customer = this.users.find((u) => u.id === params.customerId && u.role === 'ROLE_CUSTOMER')
    if (!customer) throw new HttpError(404, `Customer not found with ID: ${params.customerId}`)

    const { checkInDate, checkOutDate, roomIds, guestCounts, pricingType } = params
    if (!checkInDate || !checkOutDate) throw new HttpError(400, 'Check-in and check-out dates are required')
    const today = todayIsoDate()
    if (checkInDate < today) throw new HttpError(400, 'Check-in date cannot be in the past')
    if (checkOutDate <= checkInDate) throw new HttpError(400, 'Check-out date must be strictly after check-in date')
    if (!Array.isArray(roomIds) || roomIds.length === 0) throw new HttpError(400, 'At least one room is required')
    if (roomIds.some((id) => !Number.isInteger(id) || id <= 0)) throw new HttpError(400, 'Room IDs must be positive')
    if (new Set(roomIds).size !== roomIds.length) throw new HttpError(400, 'A room cannot appear more than once in a booking')

    if (guestCounts) {
      const idSet = new Set(roomIds.map(String))
      for (const k of Object.keys(guestCounts)) {
        if (!idSet.has(k)) throw new HttpError(400, 'Guest counts can only be supplied for rooms in this booking')
      }
    }

    const selectedRooms: RoomEntity[] = []
    for (const rid of roomIds) {
      const room = this.rooms.find((r) => r.id === rid)
      if (!room) throw new HttpError(404, 'One or more selected rooms do not exist')
      const rt = this.roomTypes.find((t) => t.id === room.roomTypeId)!
      const checkInIsToday = checkInDate === today
      if (!room.operational || room.status === 'MAINTENANCE' || (checkInIsToday && room.status !== 'AVAILABLE')) {
        throw new HttpError(409, `Room ${room.roomNumber} is not operational or available`)
      }
      if (this.hasRoomBookingOverlap(room.id, checkInDate, checkOutDate)) {
        throw new HttpError(409, `Room ${room.roomNumber} is already booked for the selected dates`)
      }
      if (this.hasRoomBlockOverlap(room.id, checkInDate, checkOutDate)) {
        throw new HttpError(409, `Room ${room.roomNumber} is blocked for the selected dates`)
      }
      const guests = guestCounts?.[String(room.id)] ?? 1
      if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, 'Each room must have at least one guest')
      if (guests > rt.capacity) throw new HttpError(400, `Guest count exceeds capacity for room ${room.roomNumber}`)
      selectedRooms.push(room)
    }

    const strategy = (pricingType || 'STANDARD').toUpperCase()
    const multiplier = this.pricingRates[strategy] ?? 1.0
    const bookingId = this.nextId('booking')
    const bookingCode = `BK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const now = new Date()
    const nights = nightsBetween(checkInDate, checkOutDate)

    let roomTotal = 0
    for (const room of selectedRooms) {
      const rt = this.roomTypes.find((t) => t.id === room.roomTypeId)!
      const pricePerNight = Math.round(rt.basePrice * multiplier)
      roomTotal += pricePerNight * nights
      this.bookingDetails.push({
        id: this.nextId('detail'),
        bookingId,
        roomId: room.id,
        pricePerNight,
        guestCount: guestCounts?.[String(room.id)] ?? 1,
      })
    }

    const depositAmount = depositRequired ? roundMoney(roomTotal * BOOKING_CONFIG.depositRate, 0) : null
    const booking: BookingEntity = {
      id: bookingId,
      bookingCode,
      customerId: customer.id,
      checkInDate,
      checkOutDate,
      status: depositRequired ? 'PENDING_DEPOSIT' : 'PENDING',
      depositAmount,
      depositRate: depositRequired ? BOOKING_CONFIG.depositRate : null,
      depositDeadline: depositRequired
        ? new Date(now.getTime() + BOOKING_CONFIG.depositTimeoutMinutes * 60_000).toISOString()
        : null,
      verificationDeadline: null,
      depositReportedAt: null,
      transferContent: depositRequired ? `COC ${bookingCode.replace(/[^A-Z0-9]/g, '')}` : null,
      depositPaidAt: null,
      depositConfirmedBy: null,
      expiredAt: null,
      confirmedAt: null,
      checkedInAt: null,
      checkedOutAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      rejectionReason: null,
      cancellationFreeHoursSnapshot: depositRequired ? BOOKING_CONFIG.cancellationFreeHours : null,
      cancellationPartialHoursSnapshot: depositRequired ? BOOKING_CONFIG.cancellationPartialHours : null,
      createdAt: now.toISOString(),
    }
    this.bookings.push(booking)
    return this.toBookingResponse(booking)
  }

  calculateCancellationPreview(booking: BookingEntity) {
    const paid = booking.depositPaidAt && booking.depositAmount ? booking.depositAmount : 0
    const freeHours = booking.cancellationFreeHoursSnapshot ?? BOOKING_CONFIG.cancellationFreeHours
    const partialHours = booking.cancellationPartialHoursSnapshot ?? BOOKING_CONFIG.cancellationPartialHours
    // Asia/Ho_Chi_Minh is UTC+7
    const checkInMs = Date.parse(`${booking.checkInDate}T14:00:00+07:00`)
    const seconds = Math.floor((checkInMs - Date.now()) / 1000)
    const refundRate = seconds >= freeHours * 3600 ? 1 : seconds >= partialHours * 3600 ? 0.5 : 0
    const refundAmount = roundMoney(paid * refundRate, 0)
    return {
      depositPaid: paid,
      refundRate,
      refundAmount,
      nonRefundableAmount: paid - refundAmount,
    }
  }

  getVietQr(booking: BookingEntity) {
    this.expireStaleBookings()
    if (booking.status !== 'PENDING_DEPOSIT' && booking.status !== 'PENDING_VERIFICATION') {
      throw new HttpError(400, 'This booking is not eligible for deposit payment')
    }
    const holdUntil =
      booking.status === 'PENDING_VERIFICATION' ? booking.verificationDeadline : booking.depositDeadline
    if (!holdUntil || Date.now() >= Date.parse(holdUntil)) {
      throw new HttpError(400, 'Booking hold has expired')
    }
    const content = booking.transferContent
    if (!content) throw new HttpError(400, 'Booking transfer reference is missing')
    const amount = Math.round(booking.depositAmount ?? 0)
    const params = new URLSearchParams({
      amount: String(amount),
      addInfo: content,
      accountName: BANK_CONFIG.accountName,
    })
    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bin}-${BANK_CONFIG.accountNumber}-compact2.png?${params.toString()}`
    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      amount,
      transferContent: content,
      bankBin: BANK_CONFIG.bin,
      accountNumber: BANK_CONFIG.accountNumber,
      accountName: BANK_CONFIG.accountName,
      qrUrl,
      depositDeadline: booking.depositDeadline,
      verificationDeadline: booking.verificationDeadline,
    }
  }

  createOrUpdateDraftInvoice(bookingId: number, surcharge = 0, discount = 0): InvoiceEntity {
    const booking = this.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new HttpError(404, 'Booking not found')
    if (booking.status !== 'CHECKED_IN') {
      throw new HttpError(400, 'Invoice can only be created for checked-in bookings')
    }
    if (surcharge < 0 || discount < 0) {
      throw new HttpError(400, 'Surcharge and discount cannot be negative')
    }

    let invoice = this.invoices.find((i) => i.bookingId === bookingId)
    if (invoice && invoice.status !== 'DRAFT') {
      throw new HttpError(409, 'An issued invoice cannot be changed')
    }
    const details = this.bookingDetails.filter((d) => d.bookingId === bookingId)
    if (!details.length) throw new HttpError(400, 'Booking has no rooms')
    const nights = nightsBetween(booking.checkInDate, booking.checkOutDate)
    if (nights <= 0) throw new HttpError(400, 'Booking dates are invalid')

    const items: InvoiceItemEntity[] = []
    let roomTotal = 0
    for (const d of details) {
      const room = this.rooms.find((r) => r.id === d.roomId)
      const perNight = roundMoney(d.pricePerNight, 2)
      const lineTotal = roundMoney(perNight * nights, 2)
      roomTotal += lineTotal
      items.push({
        id: this.nextId('invoiceItem'),
        type: 'ROOM',
        description: `Room ${room?.roomNumber ?? d.roomId} for ${nights} night(s)`,
        quantity: nights,
        unitPrice: perNight,
        lineTotal,
      })
    }

    let serviceTotal = 0
    for (const o of this.serviceOrders) {
      if (o.bookingId !== bookingId || o.cancelled || o.approvalStatus !== 'APPROVED') continue
      const svc = this.serviceItems.find((s) => s.id === o.serviceItemId)
      const detail = o.bookingDetailId ? details.find((d) => d.id === o.bookingDetailId) : undefined
      const room = detail ? this.rooms.find((r) => r.id === detail.roomId) : undefined
      const unitPrice = roundMoney(o.unitPrice, 2)
      const lineTotal = roundMoney(unitPrice * o.quantity, 2)
      serviceTotal += lineTotal
      items.push({
        id: this.nextId('invoiceItem'),
        type: 'SERVICE',
        description: `${svc?.name ?? 'Service'}${room ? ` - room ${room.roomNumber}` : ''}`,
        quantity: o.quantity,
        unitPrice,
        lineTotal,
      })
    }

    roomTotal = roundMoney(roomTotal, 2)
    serviceTotal = roundMoney(serviceTotal, 2)
    const tax = roundMoney((roomTotal + serviceTotal) * 0.1, 2)
    const surchargeRounded = roundMoney(surcharge, 2)
    const discountRounded = roundMoney(discount, 2)
    const grandTotal = roundMoney(roomTotal + serviceTotal + tax + surchargeRounded - discountRounded, 2)
    if (grandTotal < 0) throw new HttpError(400, 'Discount exceeds the invoice total')

    if (tax > 0) {
      items.push({
        id: this.nextId('invoiceItem'),
        type: 'SURCHARGE',
        description: 'Tax (10%)',
        quantity: 1,
        unitPrice: tax,
        lineTotal: tax,
      })
    }
    if (surchargeRounded > 0) {
      items.push({
        id: this.nextId('invoiceItem'),
        type: 'SURCHARGE',
        description: 'Surcharge',
        quantity: 1,
        unitPrice: surchargeRounded,
        lineTotal: surchargeRounded,
      })
    }
    if (discountRounded > 0) {
      items.push({
        id: this.nextId('invoiceItem'),
        type: 'DISCOUNT',
        description: 'Discount',
        quantity: 1,
        unitPrice: -discountRounded,
        lineTotal: -discountRounded,
      })
    }

    const depositCredit = booking.depositPaidAt && booking.depositAmount ? booking.depositAmount : 0
    if (!invoice) {
      invoice = {
        id: this.nextId('invoice'),
        bookingId,
        roomAmount: roomTotal,
        serviceAmount: serviceTotal,
        tax,
        surcharge: surchargeRounded,
        discount: discountRounded,
        totalAmount: grandTotal,
        successfulPayments: depositCredit,
        balanceDue: Math.max(0, roundMoney(grandTotal - depositCredit, 2)),
        status: 'DRAFT',
        paymentMethod: null,
        isPaid: false,
        paidAt: null,
        items,
      }
      this.invoices.push(invoice)
    } else {
      invoice.roomAmount = roomTotal
      invoice.serviceAmount = serviceTotal
      invoice.tax = tax
      invoice.surcharge = surchargeRounded
      invoice.discount = discountRounded
      invoice.totalAmount = grandTotal
      invoice.successfulPayments = depositCredit
      invoice.balanceDue = Math.max(0, roundMoney(grandTotal - depositCredit, 2))
      invoice.items = items
    }

    return invoice
  }

  refreshDraftInvoiceIfPresent(bookingId: number) {
    const invoice = this.invoices.find((i) => i.bookingId === bookingId)
    if (invoice && invoice.status === 'DRAFT') {
      this.createOrUpdateDraftInvoice(bookingId, invoice.surcharge, invoice.discount)
    }
  }

  allocateId(key: keyof typeof this.seq): number {
    return this.nextId(key)
  }
}

type SqlValue = string | number | boolean | null

function parseSqlValues(valuesClause: string): SqlValue[][] {
  const rows: SqlValue[][] = []
  let i = 0
  const len = valuesClause.length

  const skipWhitespace = () => {
    while (i < len && /\s/.test(valuesClause[i])) i++
  }

  while (i < len) {
    skipWhitespace()
    if (i >= len || valuesClause[i] !== '(') {
      i++
      continue
    }
    i++ // skip '('
    const row: SqlValue[] = []
    while (i < len) {
      skipWhitespace()
      if (valuesClause[i] === ')') {
        i++
        break
      }
      if (valuesClause[i] === "'") {
        i++
        let str = ''
        while (i < len) {
          if (valuesClause[i] === "'" && valuesClause[i + 1] === "'") {
            str += "'"
            i += 2
          } else if (valuesClause[i] === "'") {
            i++
            break
          } else {
            str += valuesClause[i++]
          }
        }
        row.push(str)
      } else {
        let token = ''
        while (i < len && valuesClause[i] !== ',' && valuesClause[i] !== ')') {
          token += valuesClause[i++]
        }
        const trimmed = token.trim()
        const upper = trimmed.toUpperCase()
        if (upper === 'NULL') row.push(null)
        else if (upper === 'TRUE') row.push(true)
        else if (upper === 'FALSE') row.push(false)
        else if (trimmed !== '' && !Number.isNaN(Number(trimmed))) row.push(Number(trimmed))
        else row.push(trimmed)
      }
      skipWhitespace()
      if (valuesClause[i] === ',') i++
    }
    rows.push(row)
    skipWhitespace()
    if (valuesClause[i] === ',') i++
  }
  return rows
}

function extractInsertRows(sql: string, tableName: string): SqlValue[][] {
  const regex = new RegExp(
    `INSERT\\s+INTO\\s+${tableName}\\s*\\([^)]*\\)\\s*VALUES\\s*([\\s\\S]*?);`,
    'gi',
  )
  const rows: SqlValue[][] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(sql)) !== null) {
    rows.push(...parseSqlValues(match[1]))
  }
  return rows
}

function loadSeedFromDataSql(): {
  roomTypes: RoomTypeEntity[]
  serviceItems: ServiceItemEntity[]
  rooms: RoomEntity[]
} | null {
  try {
    const filePath = path.resolve(process.cwd(), 'data.sql')
    if (!fs.existsSync(filePath)) return null
    const rawSql = fs.readFileSync(filePath, 'utf8')
    const cleanedSql = rawSql.replace(/^\s*--[^\r\n]*/gm, '')

    const rtRows = extractInsertRows(cleanedSql, 'room_types')
    const rtImgRows = extractInsertRows(cleanedSql, 'room_type_images')
    const svcRows = extractInsertRows(cleanedSql, 'service_items')
    const roomRows = extractInsertRows(cleanedSql, 'rooms')
    const roomImgRows = extractInsertRows(cleanedSql, 'room_images')
    const roomSvcRows = extractInsertRows(cleanedSql, 'room_services')

    if (!rtRows.length || !roomRows.length) return null

    const rtImagesMap = new Map<number, Array<{ order: number; url: string }>>()
    for (const row of rtImgRows) {
      const roomTypeId = Number(row[1])
      const url = String(row[2] || '')
      const order = Number(row[4] ?? 1)
      if (!url) continue
      const list = rtImagesMap.get(roomTypeId) ?? []
      list.push({ order, url })
      rtImagesMap.set(roomTypeId, list)
    }

    const roomTypes: RoomTypeEntity[] = rtRows.map((row) => {
      const id = Number(row[0])
      const primary = row[5] ? String(row[5]) : null
      const gallery = (rtImagesMap.get(id) ?? [])
        .sort((a, b) => a.order - b.order)
        .map((item) => item.url)
      const imageUrls = gallery.length ? gallery : primary ? [primary] : []
      return {
        id,
        name: String(row[1]),
        basePrice: Number(row[2]),
        capacity: Number(row[3]),
        description: row[4] ? String(row[4]) : null,
        imageUrl: imageUrls[0] ?? primary,
        imageUrls,
        areaSqm: row[6] !== null && row[6] !== undefined ? Number(row[6]) : null,
        amenities: row[7] ? String(row[7]) : null,
      }
    })

    const serviceItems: ServiceItemEntity[] = svcRows.map((row) => ({
      id: Number(row[0]),
      name: String(row[1]),
      unitPrice: Number(row[2]),
      unit: String(row[3]),
      active: Boolean(row[4]),
    }))

    const roomImagesMap = new Map<number, Array<{ order: number; url: string }>>()
    for (const row of roomImgRows) {
      const roomId = Number(row[1])
      const url = String(row[2] || '')
      const order = Number(row[4] ?? 1)
      if (!url) continue
      const list = roomImagesMap.get(roomId) ?? []
      list.push({ order, url })
      roomImagesMap.set(roomId, list)
    }

    const roomServicesMap = new Map<number, number[]>()
    for (const row of roomSvcRows) {
      const roomId = Number(row[0])
      const serviceId = Number(row[1])
      const list = roomServicesMap.get(roomId) ?? []
      list.push(serviceId)
      roomServicesMap.set(roomId, list)
    }

    const rooms: RoomEntity[] = roomRows.map((row) => {
      const id = Number(row[0])
      const roomTypeId = Number(row[3])
      const rt = roomTypes.find((t) => t.id === roomTypeId)
      const gallery = (roomImagesMap.get(id) ?? [])
        .sort((a, b) => a.order - b.order)
        .map((item) => item.url)
      return {
        id,
        roomNumber: String(row[1]),
        floor: Number(row[2]),
        roomTypeId,
        status: String(row[4] || 'AVAILABLE') as RoomStatus,
        operational: Boolean(row[5]),
        serviceIds: roomServicesMap.get(id) ?? [],
        imageUrls: gallery.length ? gallery : rt ? [...rt.imageUrls] : [],
      }
    })

    return { roomTypes, serviceItems, rooms }
  } catch {
    return null
  }
}

