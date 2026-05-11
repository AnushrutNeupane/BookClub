// In-memory cache for Google Books cover URLs
const coverCache = new Map()

export async function getGoogleBooksCover(title, authorName) {
  const key = `${title}__${authorName ?? ''}`
  if (coverCache.has(key)) return coverCache.get(key)

  try {
    const q = encodeURIComponent(`${title}${authorName ? ` ${authorName}` : ''}`)
    const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&langRestrict=en&maxResults=3&fields=items(volumeInfo(imageLinks))&key=${apiKey}`
    )
    if (!res.ok) throw new Error()
    const data = await res.json()

    // Find first item with any image link
    let url = null
    for (const item of data.items ?? []) {
      const links = item.volumeInfo?.imageLinks
      const raw = links?.extraLarge ?? links?.large ?? links?.medium ?? links?.thumbnail ?? null
      if (raw) {
        url = raw
          .replace('http://', 'https://')
          .replace('&edge=curl', '')
          .replace('zoom=1', 'zoom=0')
        break
      }
    }

    coverCache.set(key, url)
    return url
  } catch {
    coverCache.set(key, null)
    return null
  }
}
