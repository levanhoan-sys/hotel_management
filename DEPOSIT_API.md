# Deposit API (backend work in progress)

The routes below require an authenticated customer who owns the booking. Customer-created bookings now enter `PENDING_DEPOSIT`; receptionist walk-in bookings keep the legacy workflow.

## Current routes

- `GET /api/bookings/{bookingId}/deposit`: backend-calculated deposit amount, deadline, latest payment ID and status.
- `POST /api/bookings/{bookingId}/deposit/payment`: start a pending deposit attempt. Optional body: `{ "idempotencyKey": "client-generated-stable-key" }`. A reused key for another booking is rejected.
- `POST /api/bookings/{bookingId}/deposit/demo-complete/{paymentId}`: demo settlement, available only with Spring `dev` or `test` profile. It checks booking ownership, status, deadline, amount, and prior successful deposits while holding a booking row lock.

The demo route simulates backend settlement; it is not a real VNPay callback. Do not expose it in production. No customer booking is moved into the new flow until a usable payment path exists in the UI.

## Persistence compatibility

Deposit payments use the existing `payments` table with a `booking_id` and `payment_type=DEPOSIT`; invoice balance payments retain `payment_type=BALANCE`. The `invoice_id` column must allow null for deposits. Existing deployments must verify that schema change before enabling customer deposit creation. Existing `Payment` rows have no `payment_type`; treat them as historical balance payments and backfill that value during migration.

## Remaining contract

Cancellation preview and manual refund tracking are available. Hotel cancellation, no-show, automated provider refunds, provider verification, and production payment callbacks are not implemented yet. The current deposit payment flow requires the `dev` or `test` profile and is not a production payment contract.
