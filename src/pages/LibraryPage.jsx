import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary'
import './LibraryPage.css'

const COVER_BASE = 'https://covers.openlibrary.org/b/id'

function LibraryBookCard({ book, onRemove }) {
  const navigate = useNavigate()
  const coverUrl = book.coverId ? `${COVER_BASE}/${book.coverId}-M.jpg` : null

  return (
    <div className="lib-card">
      <div
        className="lib-card-cover-wrapper"
        onClick={() => navigate(`/book/${book.workId}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/book/${book.workId}`)}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={`Cover of ${book.title}`} className="lib-card-cover" loading="lazy" />
        ) : (
          <div className="lib-card-cover-placeholder">📖</div>
        )}
      </div>

      <div className="lib-card-info">
        <div className="lib-card-text" onClick={() => navigate(`/book/${book.workId}`)} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/book/${book.workId}`)}>
          <h3 className="lib-card-title">{book.title}</h3>
          {book.authors?.length > 0 && (
            <p className="lib-card-author">{book.authors.join(', ')}</p>
          )}
          <div className="lib-card-meta">
            {book.pageCount > 0 && <span className="meta-tag">📄 {book.pageCount} pages</span>}
            {book.firstPublishYear && <span className="meta-tag">📅 {book.firstPublishYear}</span>}
          </div>
        </div>

        <button
          className="lib-remove-btn"
          onClick={() => onRemove(book.workId)}
          title="Remove from library"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function LibraryPage() {
  const { library, removeBook } = useLibrary()
  const navigate = useNavigate()

  return (
    <div className="library-page">
      <div className="library-header">
        <h1 className="library-title">My Library</h1>
        <p className="library-count">
          {library.length === 0
            ? 'No books yet'
            : `${library.length} book${library.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {library.length === 0 ? (
        <div className="library-empty">
          <span className="empty-icon">📚</span>
          <p>Your library is empty.</p>
          <p>Browse books and hit <strong>+ Add to My Library</strong> on any book page.</p>
          <button className="browse-btn" onClick={() => navigate('/')}>Browse Books</button>
        </div>
      ) : (
        <div className="library-list">
          {library.map((book) => (
            <LibraryBookCard key={book.workId} book={book} onRemove={removeBook} />
          ))}
        </div>
      )}
    </div>
  )
}

export default LibraryPage
