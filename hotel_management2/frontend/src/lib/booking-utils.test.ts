import { describe, expect, it } from 'vitest'
import { calculateNights, guestCountsFit, uniqueRoomIds, validStay } from './booking-utils'

describe('booking input rules', () => {
  it('counts checkout as an exclusive date (13th to 14th is one night)', () => {
    expect(calculateNights('2030-05-13', '2030-05-14')).toBe(1)
    expect(calculateNights('2030-05-13', '2030-05-16')).toBe(3)
  })

  it('rejects invalid or reversed stay dates', () => {
    expect(calculateNights('2030-05-14', '2030-05-13')).toBe(0)
    expect(validStay('2030-05-13', '2030-05-14', '2030-05-14')).toBe(false)
    expect(validStay('2030-05-13', '2030-05-14', '2030-05-13')).toBe(true)
  })

  it('deduplicates room IDs and drops invalid IDs', () => {
    expect(uniqueRoomIds('8,2,8,-1,abc,0')).toEqual([8, 2])
  })

  it('checks per-room guest counts against actual capacities', () => {
    const rooms = [{ id: 8, capacity: 2 }, { id: 2, capacity: 4 }]
    expect(guestCountsFit(rooms, { 8: 2, 2: 3 })).toBe(true)
    expect(guestCountsFit(rooms, { 8: 3, 2: 3 })).toBe(false)
    expect(guestCountsFit(rooms, { 8: 2 })).toBe(false)
  })
})
