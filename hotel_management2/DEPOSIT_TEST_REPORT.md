# Deposit implementation test report

## Automated checks

- Frontend production build: `npm run build` — passed. TypeScript compilation and Vite production bundling completed; Vite emitted dependency comment annotation warnings from Zod.
- Backend package: `./mvnw.cmd -q -DskipTests package` — passed.
- Backend package: `./mvnw.cmd -DskipTests package` — passed after the implementation changes.
- Backend test suite: `./mvnw.cmd test` — passed, 18 tests, 0 failures, 0 errors, 0 skipped. Includes two VietQR unit tests for persisted amount/reference generation and customer ownership.

## Manual scenario coverage still required

Exercise an actual configured VietQR bank account in a non-production environment. Verify report-at-deadline and report-after-deadline behavior; pending-verification room holds; confirmation, wrong amount, duplicate transaction reference, simultaneous receptionist submissions and scheduler races; and expiry/late-transfer reconciliation against MySQL. Confirm demo users cannot exercise any simulated success endpoint outside the `test` profile.

This repository currently manages schema changes with Hibernate `ddl-auto:update` and `schema-deposit.sql`; it does not have Flyway configured. No chat/message module exists, so chat QR delivery was not added.
