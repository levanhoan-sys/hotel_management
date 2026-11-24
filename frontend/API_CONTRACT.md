# API Contract (verified from Spring Boot source)

Base path: `/api` (set `VITE_API_BASE_URL`; default `http://localhost:8080/api`). All responses use `{ success, message, data, timestamp }`. `GET` catalogue/room search is public. Protected calls use `Authorization: Bearer <token>`; the backend issues a stateless HMAC JWT with a 24-hour lifetime. Authentication is not cookie based.

## Authentication and profile

| Method | Endpoint | Request | Response data | Access |
|---|---|---|---|---|
| POST | `/auth/register` | `{ username, password, fullName, email, phone?, identityCard?, address? }`; username 4–50, password 8–72 | `AuthResponse { token, userId, username, fullName, email, role }` | Public; role is assigned by backend |
| POST | `/auth/login` | `{ username, password }` | `AuthResponse` | Public |
| GET | `/auth/me` | — | `AuthResponse` | Authenticated |
| GET | `/users/me` | — | `ProfileResponse { id, username, fullName, email, phone, role, accountStatus }` | Authenticated |
| PUT | `/users/me` | `{ fullName, email, phone? }` | `ProfileResponse` | Authenticated |
| PUT | `/users/me/password` | `{ currentPassword, newPassword }` | null | Authenticated |

## Public room and catalogue

Room detail now includes `areaSqm`, comma-separated `amenities`, and active `services[]` assigned to that specific room. Receptionists can set `serviceIds[]` when creating or editing a room and `areaSqm`/`amenities` when creating or editing a room type. `GET /rooms/{id}/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` returns daily `{ date, status }` values (`AVAILABLE`, `BOOKED`, `BLOCKED`, `UNAVAILABLE`) for up to 62 days. It exposes no guest or booking details.

| Method | Endpoint | Query/body | Response data | Access |
|---|---|---|---|---|
| GET | `/rooms` | Optional `checkIn`, `checkOut` (ISO LocalDate), `roomTypeId`, `minCapacity`, `minPrice`, `maxPrice` | `RoomResponse[]` | Public |
| GET | `/rooms/{id}` | — | `RoomResponse { id, roomNumber, floor, status, operational, roomTypeName, basePrice, capacity, description, imageUrl }` | Public |
| GET | `/rooms/available` | Required `checkIn`, `checkOut` (ISO LocalDate) | `RoomResponse[]` | Public |
| GET | `/room-types` | — | `{ id, name, basePrice, capacity, description, imageUrl }[]` | Public |
| GET | `/services` | — | `{ id, name, unitPrice, unit, active }[]` (active catalogue) | Public |

## Customer booking and invoice

| Method | Endpoint | Request/query | Response data | Access |
|---|---|---|---|---|
| POST | `/bookings` | `{ checkInDate, checkOutDate, roomIds: number[], guestCounts?: { [roomId]: positive number } }` | `BookingResponse` | Customer token; backend derives customerId. Room price uses the room type's fixed base price. Empty/duplicate rooms are rejected by business validation. |
| GET | `/bookings/me` | — | `BookingResponse[]` | Customer |
| GET | `/bookings/my` | `page` default 0, `size` default 20 (1–100) | Spring page of `BookingResponse` | Customer |
| GET | `/bookings/{id}` | — | `BookingResponse` | Owner or receptionist |
| PATCH | `/bookings/{id}/cancel` | Optional `{ reason? }` | null | Owner or receptionist; backend decides valid status |
| GET | `/invoices/booking/{bookingId}` | — | `InvoiceResponse` | Booking owner, receptionist, or admin |

`BookingResponse` includes `id, bookingCode, customerId, customerName, checkInDate, checkOutDate, numberOfNights, status, confirmedAt, checkedInAt, checkedOutAt, roomNumbers, rooms[{ roomId, roomNumber, guestCount, capacity, pricePerNight }], roomImageUrls, serviceOrders, totalRoomCharge, totalServiceCharge, estimatedTotal, cancelledAt, cancelledBy, cancellationReason, rejectionReason`. Booking creation may return HTTP 409 for an availability conflict.

For a checked-in booking, the owner can `POST /bookings/{id}/services` with `{ bookingRoomId, serviceItemId, quantity }`. `bookingRoomId` is the ID of the booking's room line in `BookingResponse.rooms[]`. The service must be active and offered for that room. The response includes the updated booking and service charge; active service orders are included when the invoice draft is created or refreshed at checkout. The sample catalogue contains room meals and free staff assistance.

## Receptionist and admin operations

All `/reception/**` endpoints below require `ROLE_RECEPTIONIST`, exactly as `SecurityConfig` declares. `ROLE_ADMIN` is not granted access by those URL rules in the current backend configuration.

| Method | Endpoint | Request/query | Response data |
|---|---|---|---|
| GET | `/reception/summary` | — | `{ totalRooms, availableRooms, occupiedRooms, cleaningRooms, maintenanceRooms, confirmedBookings, checkedInBookings, totalCustomers, revenue }` |
| GET | `/reception/rooms` | — | `RoomResponse[]` |
| POST | `/reception/rooms` | `{ roomNumber, floor, roomTypeId }` | `RoomResponse` |
| PUT | `/reception/rooms/{id}` | `{ roomNumber, floor, roomTypeId }` | `RoomResponse` |
| PATCH | `/reception/rooms/{id}/status` | Query `status`: `AVAILABLE, BOOKED (legacy), OCCUPIED, CLEANING, MAINTENANCE` | null |
| PATCH | `/reception/rooms/{id}/operational` | Query `active: boolean` | null |
| GET | `/reception/room-types` | — | `RoomTypeResponse[]` |
| POST/PUT | `/reception/room-types[/{id}]` | `{ name, basePrice, capacity, description?, imageUrl? }` | `RoomTypeResponse` |
| GET/POST | `/reception/rooms/{roomId}/blocks` | POST `{ startDate, endDate, reason }` | `RoomBlockResponse[]` / `RoomBlockResponse` |
| DELETE | `/reception/room-blocks/{blockId}` | — | null |
| GET | `/reception/bookings` | — | `BookingResponse[]` |
| GET | `/reception/bookings/page` | `page` default 0, `size` default 20 (1–100) | Spring page |
| POST | `/reception/bookings` | `BookingRequest` including `customerId` | `BookingResponse` (walk-in/staff booking) |
| PATCH | `/reception/bookings/{id}/confirm` | — | `BookingResponse` |
| PATCH | `/reception/bookings/{id}/reject` | Optional `{ reason? }` | `BookingResponse` |
| PUT | `/reception/bookings/{id}/rooms` | `{ roomIds: number[], guestCounts? }` | `BookingResponse` |
| GET | `/reception/customers` | — | `CustomerResponse[]` |
| POST | `/reception/bookings/{id}/check-in` | — | `BookingResponse` |
| POST | `/reception/bookings/{id}/check-out` | — | `InvoiceResponse` |
| PATCH | `/reception/rooms/{id}/cleaned` | — | null |
| GET | `/reception/services` | — | `ServiceItemResponse[]` |
| POST/PUT | `/reception/services[/{id}]` | `{ name, unitPrice, unit? }` | `ServiceItemResponse` |
| PATCH | `/reception/services/{id}/active` | Query `active: boolean` | `ServiceItemResponse` |
| GET/POST | `/reception/bookings/{bookingId}/service-usages` | POST `{ bookingRoomId, serviceItemId, quantity }` | `ServiceUsageResponse[]` / one usage |
| PATCH | `/reception/service-usages/{usageId}/cancel` | Optional `{ reason? }` | `ServiceUsageResponse` |
| POST | `/reception/bookings/{bookingId}/invoice` | Optional `{ surcharge?, discount? }` | `InvoiceResponse` draft |
| PUT | `/reception/invoices/{invoiceId}/draft` | `{ surcharge?, discount? }` | `InvoiceResponse` |
| POST | `/reception/invoices/{invoiceId}/issue` | — | `InvoiceResponse` |
| POST | `/reception/invoices/{invoiceId}/payments` | `{ amount, method, idempotencyKey, reference? }` | `PaymentResponse` |

Invoice data: `{ id, bookingId, customerName, roomAmount, serviceAmount, tax, surcharge, discount, totalAmount, successfulPayments, balanceDue, status, paymentMethod, isPaid, paidAt, items, payments }`. Payment methods/statuses are backend enums `CASH, BANK_TRANSFER, CREDIT_CARD, VNPAY` and `SUCCESSFUL, FAILED`.

## Other endpoints

| Method | Endpoint | Request | Access |
|---|---|---|---|
| POST | `/api/rooms` | `{ roomNumber, floor, roomTypeId }` | Receptionist |
| PATCH | `/api/rooms/{id}/status` | Query `status` | Receptionist |
| POST | `/api/bookings/{id}/services` | `{ serviceItemId, bookingRoomId?, quantity }` | Authenticated; owner/staff check in controller, but security matcher requires receptionist |
| POST | `/api/invoices/checkout/{bookingId}` | `{ paymentMethod, discount?, surcharge?, idempotencyKey? }` | Receptionist by security configuration; controller also checks owner/staff |
| GET | `/api/bookings/customer/{customerId}` | — | Owner or receptionist |

## Error format and status

Errors are also wrapped in `ApiResponse`: `{ success: false, message, data?, timestamp? }`. Validation failures are HTTP 400 with `data` mapping field names to messages. Known statuses: 400 validation/business error, 401 missing/expired/invalid token, 403 role/ownership denial, 404 missing resource, 409 booking conflict. Unexpected failures return 500 with a generic Vietnamese message. UI must treat backend status and message as authoritative.

## Security behavior verified in source

`SecurityConfig` is stateless, disables CSRF, allows login/register, public room/catalogue GETs, and requires bearer auth elsewhere. `/api/reception/**` requires `ROLE_RECEPTIONIST`. CORS origins are configurable. Token has no refresh endpoint; login returns `AuthResponse.token` and `/auth/me` reissues a token through the existing login profile service. Frontend keeps the bearer token in session storage for the current browser tab; this is a UX choice with XSS exposure and is not a substitute for backend authorization.
