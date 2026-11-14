# Maison An frontend

React + TypeScript + Vite customer booking portal and receptionist workspace. API request and response shapes are documented in [API_CONTRACT.md](./API_CONTRACT.md); known missing backend capabilities are listed in [API_GAPS.md](./API_GAPS.md).

## Run locally

1. Start the Spring Boot backend and MySQL database. Ensure the backend CORS origin includes `http://localhost:5173` (it is allowed by default).
2. In this folder, install packages and configure the API URL:

   ```powershell
   npm install
   Copy-Item .env.example .env
   # Edit VITE_API_BASE_URL when the backend is not at http://localhost:8080/api
   npm run dev
   ```

3. Open `http://localhost:5173`.

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
