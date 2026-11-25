const env = import.meta.env

function nonEmpty(value: string | undefined): string {
  return value?.trim() ?? ''
}

function finiteCoordinate(value: string | undefined, min: number, max: number): number | null {
  const input = nonEmpty(value)
  if (!input) return null
  const number = Number(input)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

function validGoogleMapsEmbedUrl(value: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const isGoogleHost = url.hostname === 'google.com' || url.hostname === 'www.google.com' || url.hostname === 'maps.google.com'
    if (url.protocol !== 'https:' || !isGoogleHost || !/^\/maps\/embed\/?$/.test(url.pathname)) return null
    return url.href
  } catch {
    return null
  }
}

export const hotelLocation = {
  name: nonEmpty(env.VITE_HOTEL_NAME),
  address: nonEmpty(env.VITE_HOTEL_ADDRESS),
  latitude: finiteCoordinate(env.VITE_HOTEL_LATITUDE, -90, 90),
  longitude: finiteCoordinate(env.VITE_HOTEL_LONGITUDE, -180, 180),
  mapEmbedUrl: validGoogleMapsEmbedUrl(nonEmpty(env.VITE_HOTEL_MAP_EMBED_URL)),
}

export function getMapEmbedUrl(): string | null {
  if (hotelLocation.mapEmbedUrl) return hotelLocation.mapEmbedUrl
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
  const destination = hotelLocation.latitude !== null && hotelLocation.longitude !== null
    ? `${hotelLocation.latitude},${hotelLocation.longitude}`
    : hotelLocation.address
  if (!destination) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
