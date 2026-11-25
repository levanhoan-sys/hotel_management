# Manual payment verification

Open **Reception → Xác nhận tiền cọc**, select a reported booking, and inspect the hotel's bank account outside this application. Verify the received amount and transaction reference against the real statement, then enter both values and confirm the dialog. The endpoint is receptionist-only. It locks the booking during confirmation, checks the exact expected amount, and rejects a reference already used by a successful bank transfer.

Reject verification only after checking the actual account. A rejected booking becomes `EXPIRED` and releases its room. If money arrived late, was sent with a wrong amount, or arrived after rejection, reconcile and refund it outside the app using the existing refund workflow. A screenshot or customer report is not proof of receipt.

The hosted VietQR image and transfer information are not an automatic payment integration. No bank webhook or automatic transaction lookup is used.
