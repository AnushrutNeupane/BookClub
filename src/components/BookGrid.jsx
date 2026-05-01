import BookCard from './BookCard'
import './BookGrid.css'

function BookGrid({ books, loading }) {
  if (loading) {
    return (
      <div className="book-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="book-card-skeleton" />
        ))}
      </div>
    )
  }

  if (books.length === 0) return null

  return (
    <div className="book-grid">
      {books.map((book) => (
        <BookCard key={book.key} book={book} />
      ))}
    </div>
  )
}

export default BookGrid
