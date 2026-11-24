# Backend API gaps and frontend handling

Findings are based on the current Spring Boot controllers, DTOs, services and security configuration.

| Requested capability | Backend state | Frontend handling |
|---|---|---|
| Online deposit / payment gateway and payment status polling | No deposit intent/deadline/retry API. Payment strategies for card/VNPay are not integrated; README states they reject instead of confirming. | No deposit or simulated gateway flow. Receptionist can record payment through the actual invoice API; UI communicates that success comes from backend response. |
| Refund and cancellation refund policy | No refund endpoint or policy response. | No refund controls or invented policy. |
| Room calendar endpoint | No dedicated calendar API, but room and booking lists contain actual room/date/status records. | Calendar can be derived only from those records; no occupancy inference from incomplete data. |
| Booking search by booking code / customer search endpoint | Reception list exposes all bookings/customers, but there is no search query API. | Search is client-side over actual loaded receptionist data. Customer walk-in selection uses loaded actual customers. |
| Server-side booking filters, sort, and reliable page metadata | Booking page accepts page/size; controller returns a page but has no filter parameters. Public room search has no pagination. | Client-side filters for loaded dataset; pagination only where response includes page metadata. No fabricated counts. |
| Today's arrivals/departures and pending booking dashboard metrics | Summary has room counts, confirmed and checked-in counts, but not arrival/departure/pending metrics. Booking list provides dates/status. | Derive arrival/departure/pending counts from actual bookings; clearly scoped to the fetched data. |
| Password recovery / refresh-token endpoint | No forgot-password or refresh API. JWT is 24 hours; `/auth/me` returns an auth profile/token but should not be treated as a dedicated refresh contract. | Expired token clears session and returns user to login. |
| Admin access to receptionist APIs | `SecurityConfig` protects `/api/reception/**` with `hasRole("RECEPTIONIST")`; `ROLE_ADMIN` is not included in this matcher. | Receptionist workspace requires `ROLE_RECEPTIONIST`; a `ROLE_ADMIN` token cannot use these endpoints under current security rules. |
| Invoice PDF / receipt download | Invoice JSON is available; no PDF generation/download endpoint. | Invoice detail is viewable and printable via browser; no PDF API is claimed. |
| Room inventory image upload | DTOs accept image URLs, but no upload API exists; room image may be absent. | Use the backend URL when present; otherwise show a clearly generic visual fallback without claiming it depicts that room. |
| Booking special requests / customer-entered notes | `BookingRequest` has no special-request field. | Booking form states this limitation and does not collect or silently discard a note. |

No mock API or synthetic operational/financial records are used.
