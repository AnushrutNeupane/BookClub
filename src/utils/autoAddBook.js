import { cachedFetch } from './cache'

// Fetches minimal book metadata and adds it to the user's library if not already present.
// Silently no-ops if the book is already in the library or if the fetch fails.
export async function autoAddBook(workId, fallbackTitle, { isInLibrary, addBook }) {
  if (!workId || isInLibrary(workId)) return

  try {
    const workData = await cachedFetch(
      `https://openlibrary.org/works/${workId}.json`,
      { headers: { 'User-Agent': 'BookClub App (dev@bookclub.app)' } }
    )

    // Resolve first author name
    let authors = []
    const authorRefs = workData.authors ?? []
    if (authorRefs.length > 0) {
      try {
        const authorKey = authorRefs[0].author?.key
        if (authorKey) {
          const authorData = await cachedFetch(
            `https://openlibrary.org${authorKey}.json`,
            { headers: { 'User-Agent': 'BookClub App (dev@bookclub.app)' } }
          )
          if (authorData.name) authors = [authorData.name]
        }
      } catch {}
    }

    addBook({
      workId,
      title: workData.title ?? fallbackTitle ?? 'Unknown Title',
      authors,
      coverId: workData.covers?.[0] ?? null,
      firstPublishYear: workData.first_publish_date ?? null,
      pageCount: null,
    })
  } catch {
    // If fetch fails, add with just the title we already have
    if (!isInLibrary(workId)) {
      addBook({
        workId,
        title: fallbackTitle ?? 'Unknown Title',
        authors: [],
        coverId: null,
        firstPublishYear: null,
        pageCount: null,
      })
    }
  }
}
