// Simple in-memory cache for API responses.
// Survives re-renders and navigation within the same session.
const cache = new Map()

export async function cachedFetch(url, options) {
  if (cache.has(url)) {
    return cache.get(url)
  }
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const data = await res.json()
  cache.set(url, data)
  return data
}
