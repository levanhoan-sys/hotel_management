# Deposit and refund integration plan

## Current repository findings

- The project has a Spring Boot backend and a React/TypeScript frontend in the same repository.
- `BookingServiceImpl` creates bookings in `PENDING`; receptionist confirmation is a separate workflow.
- Availability queries currently treat `PENDING`, `CONFIRMED`, and `CHECKED_IN` as occupying dates. Room rows are locked during booking creation.
- `Payment` currently belongs to an `Invoice` and represents successful invoice payments. `InvoiceServiceImpl` relies on that behavior.
- Payment strategy classes exist, including a VNPay strategy, but there is no implemented deposit lifecycle or refund aggregate.
- Persistence uses `spring.jpa.hibernate.ddl-auto=update` and SQL data initialization; no Flyway migrations are present.
- The customer UI already has booking creation, booking details/history, and receptionist workflows. Existing statuses and payment contracts are therefore compatibility-sensitive.

## Integration decisions

1. Preserve receptionist walk-in creation and legacy bookings; introduce the deposit state only for customer-created bookings.
2. Use additive schema changes and retain existing invoice payment semantics. A deposit payment must be linked to a booking independently of the final invoice.
3. Treat an unexpired `PENDING_DEPOSIT` booking as a room hold. Availability checks must compare its absolute deadline to backend time, even before the expiration scheduler updates its state.
4. Store configuration and the cancellation-policy snapshot on each new customer booking. Keep legacy bookings out of the deposit/refund policy.
5. Use a backend-owned sandbox/mock payment implementation only in development/test. Never let the browser set payment success in production.
6. Build cancellation/refund APIs around persisted payment/refund records, and calculate all money in `BigDecimal`.
7. Add customer deposit status/payment UI, booking status/refund visibility, and receptionist refund processing without removing existing booking and invoice views.

## Phases

1. Source inspection and compatibility plan (completed in this document).
2. Additive booking/payment/refund domain and schema changes.
3. Customer deposit booking, temporary room hold, and idempotent expiration.
4. Payment gateway abstraction and verified sandbox payment flow.
5. Cancellation preview, policy snapshot, refunds, receptionist processing, and no-show.
6. Apply successful deposits/refunds to invoice balances and checkout validation.
7. Customer and receptionist frontend integration.
8. Unit/integration tests and API/policy/flow documentation.

## Current implementation boundary

Booking snapshot fields, centralized properties, a customer-deposit creation service method, deadline-aware availability queries, and an expiration job have been added. The customer creation route continues to use the existing workflow until payment initiation, verified confirmation, refunds, billing, and frontend payment handling are implemented together. This prevents creating bookings that a customer cannot pay for yet.

## Deadline policy

The backend decides validity using `Instant` and the configured `Asia/Ho_Chi_Minh` hotel zone. In the first version a deposit confirms a booking only when backend verification accepts it before the persisted deadline. A late provider success does not restore an expired booking and must be recorded for reconciliation/refund.

## Existing data

No existing booking will be converted to a deposit booking, and existing invoice payments remain attached to invoices. New fields must be nullable or have safe defaults for historical rows. The current repository has no migration framework, so introducing Flyway must be coordinated with the existing `ddl-auto:update` and SQL initialization before deployment.
