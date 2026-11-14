# Deposit payment flow

1. Customer creates a booking. The server snapshots room prices, calculates a 30% deposit and starts a 15-minute hold (`PENDING_DEPOSIT`).
2. The booking detail loads its VietQR Quick Link. Customer transfers the exact amount with the unique booking description.
3. Customer selects **Tôi đã chuyển khoản** before or at the deposit deadline. Server records the report time, changes the booking to `PENDING_VERIFICATION`, and extends the room hold by 30 minutes.
4. Receptionist checks the hotel's bank account and uses **Xác nhận tiền cọc** to enter the amount actually received and bank transaction reference.
5. Only a matching amount and unused reference can confirm the payment and booking. Otherwise, the receptionist may reject verification; the booking then expires and an incoming transfer must be reconciled manually.

The expiration job is a cleanup mechanism. Availability queries also compare deposit and verification deadlines, so a delayed scheduler does not hold a room past its deadline. Transfer reports use server time and are accepted at the deadline instant, but rejected after it.
