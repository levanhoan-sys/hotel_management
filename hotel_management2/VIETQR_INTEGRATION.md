# VietQR Quick Link

The backend builds QR URLs using VietQR's hosted image service (`img.vietqr.io`). The image is an external dependency; bank details, amount and transfer reference are assembled on the server. The browser never supplies an amount or receiving account. If the image cannot load, the customer page shows the same server response as manual transfer details.

Set `HOTEL_BANK_BIN`, `HOTEL_BANK_ACCOUNT`, and `HOTEL_BANK_ACCOUNT_NAME` in the backend environment. The BIN must contain six digits, the account number 6–20 digits, and the account name up to 100 characters. No real account is included in this repository. With all three values blank, the app can run locally, but the QR endpoint returns a configuration error. Partial or malformed values fail application startup.

The QR amount comes from the persisted booking deposit (30% of the room total, rounded to whole VND). Its unique description is `COC` followed by the booking code. VietQR displays a static payment instruction; it does not report or verify bank transfers.
