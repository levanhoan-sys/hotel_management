export type MapPoint = { latitude: number; longitude: number }

export function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (
      url.hostname === 'maps.app.goo.gl' ||
      url.hostname === 'maps.google.com' ||
      url.hostname === 'www.google.com' ||
      url.hostname === 'google.com'
    )
  } catch {
    return false
  }
}

export function pointFromGoogleMapsUrl(value: string): MapPoint | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }
  const place = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  const center = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  const pair = place ?? center
  if (!pair) return null
  const latitude = Number(pair[1])
  const longitude = Number(pair[2])
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) && Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null
}

export async function resolveGoogleMapsPoint(value: string): Promise<MapPoint | null> {
  if (!isGoogleMapsUrl(value)) return null
  const direct = pointFromGoogleMapsUrl(value)
  if (direct) return direct
  if (new URL(value).hostname !== 'maps.app.goo.gl') return null
  try {
    const response = await fetch(value, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) })
    if (!isGoogleMapsUrl(response.url)) return null
    return pointFromGoogleMapsUrl(response.url)
  } catch {
    return null
  }
}
