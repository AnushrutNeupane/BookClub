// Google Books API helpers

const API_KEY = () => import.meta.env.VITE_GOOGLE_BOOKS_API
const BASE = 'https://www.googleapis.com/books/v1'

// Extract the best available cover URL from a volumeInfo.imageLinks object
export function extractCoverUrl(imageLinks, size = 'large') {
  if (!imageLinks) return null
  const order = size === 'large'
    ? ['extraLarge', 'large', 'medium', 'thumbnail', 'smallThumbnail']
    : ['thumbnail', 'smallThumbnail', 'medium']
  for (const key of order) {
    if (imageLinks[key]) {
      return imageLinks[key]
        .replace('http://', 'https://')
        .replace('&edge=curl', '')
      // intentionally NOT replacing zoom=1 — zoom=0 causes oversized partial images
    }
  }
  return null
}

// Normalize a Google Books volume into the shape the app uses
export function normalizeVolume(item) {
  const v = item.volumeInfo ?? {}
  return {
    key: item.id,
    id: item.id,
    title: v.title ?? 'Unknown Title',
    author_name: v.authors ?? [],
    number_of_pages_median: v.pageCount ?? null,
    first_publish_year: v.publishedDate ? parseInt(v.publishedDate) : null,
    coverUrl: extractCoverUrl(v.imageLinks, 'small'),
    coverUrlLarge: extractCoverUrl(v.imageLinks, 'large'),
    description: v.description ?? null,
    categories: v.categories ?? [],
  }
}

// ── Retry helper ──────────────────────────────────────────────────────────────
async function fetchWithRetry(url, retries = 2, delayMs = 800) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res
    if (res.status === 503 && attempt < retries) {
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)))
      continue
    }
    throw new Error(`HTTP ${res.status}`)
  }
}

// ── Session-persistent cache ──────────────────────────────────────────────────
function sessionGet(key) {
  try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null }
}
function sessionSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ── Search ────────────────────────────────────────────────────────────────────
const searchCache = new Map()
export async function searchBooks(query, maxResults = 24) {
  const cacheKey = `gb_search:${query}:${maxResults}`
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)
  const stored = sessionGet(cacheKey)
  if (stored) { searchCache.set(cacheKey, stored); return stored }

  const res = await fetchWithRetry(
    `${BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&langRestrict=en&fields=items(id,volumeInfo(title,authors,pageCount,publishedDate,imageLinks,description,categories))&key=${API_KEY()}`
  )
  const data = await res.json()
  const results = (data.items ?? []).map(normalizeVolume)
  searchCache.set(cacheKey, results)
  sessionSet(cacheKey, results)
  return results
}

// ── Single volume ─────────────────────────────────────────────────────────────
const volumeCache = new Map()
export async function fetchVolume(id) {
  if (volumeCache.has(id)) return volumeCache.get(id)
  const stored = sessionGet(`gb_vol:${id}`)
  if (stored) { volumeCache.set(id, stored); return stored }

  const res = await fetchWithRetry(
    `${BASE}/volumes/${id}?fields=id,volumeInfo(title,authors,pageCount,publishedDate,imageLinks,description,categories)&key=${API_KEY()}`
  )
  const data = await res.json()
  const result = normalizeVolume(data)
  volumeCache.set(id, result)
  sessionSet(`gb_vol:${id}`, result)
  return result
}

// ── Subject books (staggered to avoid rate limits) ────────────────────────────
const subjectCache = new Map()
let subjectQueue = Promise.resolve()

export async function fetchSubjectBooks(subject, maxResults = 12) {
  const cacheKey = `gb_subj:${subject}:${maxResults}`
  if (subjectCache.has(cacheKey)) return subjectCache.get(cacheKey)
  const stored = sessionGet(cacheKey)
  if (stored) { subjectCache.set(cacheKey, stored); return stored }

  // Queue requests 400ms apart to avoid simultaneous hits
  const result = await new Promise((resolve, reject) => {
    subjectQueue = subjectQueue.then(async () => {
      try {
        const res = await fetchWithRetry(
          `${BASE}/volumes?q=subject:${encodeURIComponent(subject)}&maxResults=${maxResults}&orderBy=relevance&langRestrict=en&fields=items(id,volumeInfo(title,authors,pageCount,publishedDate,imageLinks,categories))&key=${API_KEY()}`
        )
        const data = await res.json()
        const books = (data.items ?? []).map(normalizeVolume)
        subjectCache.set(cacheKey, books)
        sessionSet(cacheKey, books)
        resolve(books)
      } catch (e) {
        resolve([]) // fail gracefully — show empty section rather than crash
      }
      await new Promise((r) => setTimeout(r, 400)) // stagger next request
    })
  })

  return result
}
