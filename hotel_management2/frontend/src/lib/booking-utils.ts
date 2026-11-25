export function uniqueRoomIds(value: string | null): number[] {
  return [...new Set((value || '').split(',').map(Number).filter(id => Number.isSafeInteger(id) && id > 0))]
}

export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const start = Date.parse(`${checkIn}T00:00:00Z`)
  const end = Date.parse(`${checkOut}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 86_400_000)
}

export function validStay(checkIn: string, checkOut: string, today: string): boolean {
  return Boolean(checkIn && calculateNights(checkIn, checkOut) > 0 && checkIn >= today)
}

export function guestCountsFit(rooms: Array<{ id: number; capacity: number }>, requested: Record<number, number>): boolean {
  return rooms.every(room => Number.isInteger(requested[room.id]) && requested[room.id] > 0 && requested[room.id] <= room.capacity)
}
