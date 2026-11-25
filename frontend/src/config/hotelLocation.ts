const env = import.meta.env
declare const __HOTEL_MAP_POINT__: { latitude: number; longitude: number } | null

function nonEmpty(value: string | undefined): string {
  return value?.trim() ?? ''
}

function validGoogleMapsUrl(value: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const isGoogleHost = url.hostname === 'maps.app.goo.gl' || url.hostname === 'google.com' || url.hostname === 'www.google.com' || url.hostname === 'maps.google.com'
    if (url.protocol !== 'https:' || !isGoogleHost) return null
    return url.href
  } catch {
    return null
  }
}

export const hotelLocation = {
  name: nonEmpty(env.VITE_HOTEL_NAME),
  address: nonEmpty(env.VITE_HOTEL_ADDRESS),
  latitude: __HOTEL_MAP_POINT__?.latitude ?? null,
  longitude: __HOTEL_MAP_POINT__?.longitude ?? null,
  mapUrl: validGoogleMapsUrl(nonEmpty(env.VITE_HOTEL_MAP_URL)),
}

export function getMapEmbedUrl(): string | null {
  const place = hotelLocation.latitude !== null && hotelLocation.longitude !== null
    ? `${hotelLocation.latitude},${hotelLocation.longitude}`
    : hotelLocation.address
  if (!place) return null
  return `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`
}

export const hotelContact = {
  hotline: nonEmpty(env.VITE_HOTLINE_NUMBER),
  zaloUrl: (() => {
    const value = nonEmpty(env.VITE_ZALO_PERSONAL_URL)
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && (url.hostname === 'zalo.me' || url.hostname.endsWith('.zalo.me')) ? url.href : ''
    } catch {
      return ''
    }
  })(),
}

export function getDirectionsUrl(): string | null {
  if (hotelLocation.mapUrl) return hotelLocation.mapUrl
  const destination = hotelLocation.latitude !== null && hotelLocation.longitude !== null
    ? `${hotelLocation.latitude},${hotelLocation.longitude}`
    : hotelLocation.address
  if (!destination) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
