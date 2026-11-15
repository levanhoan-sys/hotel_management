# Maison An frontend

React + TypeScript + Vite customer booking portal and receptionist workspace. API request and response shapes are documented in [API_CONTRACT.md](./API_CONTRACT.md); known missing backend capabilities are listed in [API_GAPS.md](./API_GAPS.md).

## Run locally

1. Start the Spring Boot backend and MySQL database. Ensure the backend CORS origin includes `http://localhost:5173` (it is allowed by default).
2. In this folder, install packages and configure the API URL and public contact details:

   ```powershell
   npm install
   Copy-Item .env.example .env
   # Set VITE_API_BASE_URL and the contact values below in .env
   npm run dev
   ```

3. Open `http://localhost:5173`.

## Customer contact buttons

The customer site shows floating Zalo and hotline buttons. Receptionist pages do not show them. Set these values in `frontend/.env` (copy `frontend/.env.example` first), then restart Vite after editing:

```dotenv
VITE_ZALO_PERSONAL_URL=https://zalo.me/<your-public-personal-profile-link>
VITE_HOTLINE_NUMBER=+849xxxxxxxx
```

- Configure `VITE_ZALO_PERSONAL_URL` with the employee's personal Zalo profile link. Copy the profile link from Zalo's sharing/profile feature and check that it opens the intended personal profile in a signed-out browser. Only HTTPS `zalo.me` links are accepted. This link may open a profile rather than a chat; Zalo sign-in or an extra tap may be required. On mobile, the browser/Zalo app handles the link when supported. On a laptop, it opens in a new tab and does not replace the hotel page.
- Configure `VITE_HOTLINE_NUMBER` with the hotel's public contact number in international format, such as `+849xxxxxxxx` (replace with the actual number). On narrow/mobile screens, the button opens the device's default phone handler. On desktop, it opens a dialog with copy and `tel:` options. If there is no calling app on the computer, use a phone to call the displayed number.
- These `VITE_` values are public and become part of the frontend bundle. Do not put passwords, tokens, or other secrets here. Buttons with missing or invalid values are hidden; invalid non-empty values are reported in the development console.

To check Zalo manually, use the configured link in a laptop browser and on a phone with Zalo installed. Confirm the hotel page remains open after clicking; app handoff and whether the profile leads directly to a conversation depend on Zalo and the device.

Production checks:

```powershell
npm run lint
npm run build
```

## Implemented screens

- Customer: home, room search/filter, room detail, multi-room selection, booking request, login/register, booking history/cancellation and profile editing.
- Receptionist/admin: operations dashboard, room status, room types, booking confirm/reject/cancel, room calendar, check-in, checkout invoice/payment flow, service catalogue and service usage, invoice issue, cash payment, checkout completion.
- Data screens use Spring API responses; the site does not seed or fabricate room, booking, account, payment, or summary records.
- Component/unit tests use mocked HTTP responses only to isolate frontend behavior; they do not prove live API integration. Start the backend to verify endpoint connectivity and database-dependent flows.

## Authentication

Login/register use the backend bearer JWT. The token is stored in `sessionStorage`, sent by the central Axios client, and cleared on HTTP 401. This keeps the session scoped to the browser tab; bearer tokens in web storage remain exposed to same-origin script injection. The backend currently has no refresh-token endpoint. Role checks in React only control navigation and do not replace backend authorization.

## Notes

- Customer room selection sends ISO dates (`yyyy-MM-dd`) and `guestCounts` keyed by room ID. Price and availability remain backend decisions; a 409 conflict is shown to the user.
- Booking notes, online deposit/gateway payment, refunds, and invoice PDF generation are not represented as working features because no matching backend contract exists.
- Reception checkout is only completed after an issued invoice has been fully paid according to backend state. Payment recording is limited to supported manual methods; the current UI records cash.
