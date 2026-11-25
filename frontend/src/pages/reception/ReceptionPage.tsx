import { RoomsManagement } from './RoomsManagement'
import { RoomTypesManagement } from './RoomTypesManagement'
import { BookingsManagement } from './BookingsManagement'
import { RoomCalendar } from './RoomCalendar'
import { Lifecycle } from './Lifecycle'
import { ServicesManagement } from './ServicesManagement'
import { InvoicesManagement } from './InvoicesManagement'

export function ReceptionPage({
  kind,
}: {
  kind: 'rooms' | 'room-types' | 'bookings' | 'calendar' | 'check-in' | 'check-out' | 'services' | 'invoices'
}) {
  if (kind === 'rooms') return <RoomsManagement />
  if (kind === 'room-types') return <RoomTypesManagement />
  if (kind === 'bookings') return <BookingsManagement />
  if (kind === 'calendar') return <RoomCalendar />
  if (kind === 'check-in') return <Lifecycle kind="check-in" />
  if (kind === 'check-out') return <Lifecycle kind="check-out" />
  if (kind === 'services') return <ServicesManagement />
  return <InvoicesManagement />
}
