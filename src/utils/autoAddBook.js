import { fetchVolume } from './gbBooks'

// Fetches book metadata from Google Books and adds it to the library if not already present.
export async function autoAddBook(bookId, fallbackTitle, { isInLibrary, addBook }) {
  if (!bookId || isInLibrary(bookId)) return

  try {
    const vol = await fetchVolume(bookId)
    addBook({
      workId: bookId,
      title: vol.title,
      authors: vol.author_name,
      coverUrl: vol.coverUrl ?? null,
      firstPublishYear: vol.first_publish_year,
      pageCount: vol.number_of_pages_median,
    })
  } catch {
    if (!isInLibrary(bookId)) {
      addBook({
        workId: bookId,
        title: fallbackTitle ?? 'Unknown Title',
        authors: [],
        coverUrl: null,
        firstPublishYear: null,
        pageCount: null,
      })
    }
  }
}
