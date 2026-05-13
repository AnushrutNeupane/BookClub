import { useState } from 'react'
import BookGrid from './BookGrid'
import { searchBooks } from '../utils/gbBooks'
import './BookSearch.css'

const POPULAR_SEARCHES = ['Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Horror', 'History']

function BookSearch() {
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  const doSearch = async (searchQuery) => {
    const q = searchQuery ?? query
    if (!q.trim()) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const results = await searchBooks(q, 24)
      setBooks(results)
    } catch {
      setError('Something went wrong fetching books. Please try again.')
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    doSearch()
  }

  const handleQuickSearch = (term) => {
    setQuery(term)
    doSearch(term)
  }

  return (
    <div className="book-search">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search for books, authors, or topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {!searched && (
        <div className="quick-searches">
          <p className="quick-label">Popular searches</p>
          <div className="quick-tags">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                className="quick-tag"
                onClick={() => handleQuickSearch(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {searched && !loading && !error && (
        <p className="results-count">
          {books.length > 0
            ? `Showing ${books.length} results`
            : 'No books found. Try a different search.'}
        </p>
      )}

      <BookGrid books={books} loading={loading} />
    </div>
  )
}

export default BookSearch
