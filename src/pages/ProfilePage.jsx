import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUsername } from '../hooks/useUsername'
import { useLibrary } from '../hooks/useLibrary'
import { useReviews } from '../hooks/useReviews'
import { useReadingStatus, STATUSES } from '../hooks/useReadingStatus'
import { usePrivateRooms } from '../hooks/usePrivateRooms'
import StarRating from '../components/StarRating'
import './ProfilePage.css'

const COVER_BASE = 'https://covers.openlibrary.org/b/id'

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function ProfilePage() {
  const navigate = useNavigate()
  const { username, setUsername } = useUsername()
  const { library } = useLibrary()
  const { reviews } = useReviews()
  const { getStatus } = useReadingStatus()
  const { myRooms } = usePrivateRooms(username)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(username)

  const saveName = () => {
    if (nameInput.trim()) {
      setUsername(nameInput.trim())
      setEditingName(false)
    }
  }

  // Aggregate stats
  const finished = library.filter((b) => getStatus(b.workId) === 'finished')
  const reading = library.filter((b) => getStatus(b.workId) === 'reading')
  const interested = library.filter((b) => getStatus(b.workId) === 'interested')
  const noStatus = library.filter((b) => !getStatus(b.workId))

  const reviewList = Object.entries(reviews).map(([workId, review]) => {
    const book = library.find((b) => b.workId === workId)
    return { workId, review, book }
  })

  const avgRating = reviewList.length > 0
    ? (reviewList.reduce((sum, { review }) => sum + review.rating, 0) / reviewList.length).toFixed(1)
    : null

  const initials = username
    ? username.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="profile-page">

      {/* Avatar + name */}
      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-identity">
          {editingName ? (
            <div className="name-edit-row">
              <input
                className="name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                autoFocus
                maxLength={32}
              />
              <button className="name-save-btn" onClick={saveName}>Save</button>
              <button className="name-cancel-btn" onClick={() => { setEditingName(false); setNameInput(username) }}>Cancel</button>
            </div>
          ) : (
            <div className="name-display-row">
              <h1 className="profile-name">{username || 'Anonymous'}</h1>
              <button className="name-edit-btn" onClick={() => setEditingName(true)}>Edit</button>
            </div>
          )}
          <p className="profile-sub">{library.length} book{library.length !== 1 ? 's' : ''} in library</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <StatCard value={library.length} label="Total Books" />
        <StatCard value={finished.length} label="Finished" />
        <StatCard value={reading.length} label="Reading" />
        <StatCard value={interested.length} label="Interested" />
        <StatCard value={reviewList.length} label="Reviews" />
        {avgRating && <StatCard value={`⭐ ${avgRating}`} label="Avg Rating" />}
      </div>

      {/* Books by status */}
      {STATUSES.map((s) => {
        const books = library.filter((b) => getStatus(b.workId) === s.key)
        if (books.length === 0) return null
        return (
          <section key={s.key} className="profile-section">
            <h2 className="profile-section-title">
              {s.emoji} {s.label}
              <span className="section-count">{books.length}</span>
            </h2>
            <div className="profile-book-list">
              {books.map((book) => {
                const review = reviews[book.workId]
                const coverUrl = book.coverUrl ?? null
                return (
                  <div
                    key={book.workId}
                    className="profile-book-row"
                    onClick={() => navigate(`/book/${book.workId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/book/${book.workId}`)}
                  >
                    <div className="profile-book-cover-wrapper">
                      {coverUrl
                        ? <img src={coverUrl} alt={book.title} className="profile-book-cover" loading="lazy" />
                        : <div className="profile-book-cover-placeholder">📖</div>
                      }
                    </div>
                    <div className="profile-book-info">
                      <p className="profile-book-title">{book.title}</p>
                      {book.authors?.length > 0 && (
                        <p className="profile-book-author">{book.authors.join(', ')}</p>
                      )}
                      {review
                        ? <StarRating value={review.rating} size="sm" />
                        : <p className="profile-no-review">No review yet</p>
                      }
                    </div>
                    {review?.text && (
                      <p className="profile-review-text">"{review.text}"</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Books with no status */}
      {noStatus.length > 0 && (
        <section className="profile-section">
          <h2 className="profile-section-title">
            📚 No Status
            <span className="section-count">{noStatus.length}</span>
          </h2>
          <div className="profile-book-list">
            {noStatus.map((book) => {
              const coverUrl = book.coverUrl ?? null
              return (
                <div
                  key={book.workId}
                  className="profile-book-row"
                  onClick={() => navigate(`/book/${book.workId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/book/${book.workId}`)}
                >
                  <div className="profile-book-cover-wrapper">
                    {coverUrl
                      ? <img src={coverUrl} alt={book.title} className="profile-book-cover" loading="lazy" />
                      : <div className="profile-book-cover-placeholder">📖</div>
                    }
                  </div>
                  <div className="profile-book-info">
                    <p className="profile-book-title">{book.title}</p>
                    {book.authors?.length > 0 && (
                      <p className="profile-book-author">{book.authors.join(', ')}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {myRooms.length > 0 && (
        <section className="profile-section">
          <h2 className="profile-section-title">
            🔒 My Private Rooms
            <span className="section-count">{myRooms.length}</span>
          </h2>
          <div className="profile-book-list">
            {myRooms.map((room) => (
              <div
                key={room.id}
                className="profile-book-row"
                onClick={() => navigate(`/private-room/${room.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/private-room/${room.id}`)}
              >
                <div className="profile-book-info">
                  <p className="profile-book-title">{room.name}</p>
                  <p className="profile-book-author">📖 {room.bookTitle}</p>
                </div>
                <p className="profile-no-review">
                  {room.members?.length ?? 1} member{room.members?.length !== 1 ? 's' : ''}
                  {room.createdBy === username ? ' · created by you' : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {library.length === 0 && (
        <div className="profile-empty">
          <span>📚</span>
          <p>Your library is empty. Add some books to get started.</p>
          <button className="browse-btn" onClick={() => navigate('/')}>Browse Books</button>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
