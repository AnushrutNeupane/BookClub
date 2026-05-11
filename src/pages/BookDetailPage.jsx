import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary'
import { useReviews } from '../hooks/useReviews'
import { useReadingStatus, STATUSES } from '../hooks/useReadingStatus'
import { useUsername } from '../hooks/useUsername'
import { usePrivateRooms, useBookRooms } from '../hooks/usePrivateRooms'
import { cachedFetch } from '../utils/cache'
import StarRating from '../components/StarRating'
import './BookDetailPage.css'

const COVER_BASE = 'https://covers.openlibrary.org/b/id'
const DESCRIPTION_LIMIT = 400 // characters before truncating

function DescriptionBlock({ description }) {
  const [expanded, setExpanded] = useState(false)
  const isFallback = description === 'No description available for this book.'
  const isLong = !isFallback && description.length > DESCRIPTION_LIMIT
  const displayed = isLong && !expanded
    ? description.slice(0, DESCRIPTION_LIMIT).trimEnd() + '…'
    : description

  return (
    <div className="detail-description">
      <h2 className="section-heading">About this book</h2>
      <p className={isFallback ? 'description-fallback' : ''}>{displayed}</p>
      {isLong && (
        <button className="description-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}
    </div>
  )
}

function ReviewBlock({ workId }) {
  const { getReview, saveReview, deleteReview } = useReviews()
  const existing = getReview(workId)
  const [editing, setEditing] = useState(!existing)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [text, setText] = useState(existing?.text ?? '')

  // Sync if review changes externally
  useEffect(() => {
    const r = getReview(workId)
    if (r) {
      setRating(r.rating)
      setText(r.text)
      setEditing(false)
    } else {
      setRating(0)
      setText('')
      setEditing(true)
    }
  }, [workId])

  const handleSave = () => {
    if (rating === 0) return
    saveReview(workId, { rating, text })
    setEditing(false)
  }

  const handleDelete = () => {
    deleteReview(workId)
    setRating(0)
    setText('')
    setEditing(true)
  }

  return (
    <div className="review-block">
      <h2 className="section-heading">My Review</h2>

      {editing ? (
        <div className="review-form">
          <StarRating value={rating} onChange={setRating} size="lg" />
          <textarea
            className="review-textarea"
            placeholder="Write your thoughts... (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />
          <div className="review-form-actions">
            <button
              className="review-save-btn"
              onClick={handleSave}
              disabled={rating === 0}
            >
              Save Review
            </button>
            {existing && (
              <button className="review-cancel-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
          {rating === 0 && (
            <p className="review-hint">Select a star rating to save</p>
          )}
        </div>
      ) : (
        <div className="review-display">
          <StarRating value={existing?.rating ?? 0} size="lg" />
          {existing?.text && <p className="review-text">{existing.text}</p>}
          <div className="review-display-actions">
            <button className="review-edit-btn" onClick={() => setEditing(true)}>Edit</button>
            <button className="review-delete-btn" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

function BookDetailPage() {
  const { workId } = useParams()
  const navigate = useNavigate()
  const { addBook, removeBook, isInLibrary } = useLibrary()
  const { getStatus, setStatus, clearStatus } = useReadingStatus()
  const { username } = useUsername()
  const { myRooms, createRoom, joinByCode } = usePrivateRooms(username)
  const allBookRooms = useBookRooms(workId)
  const inLibrary = isInLibrary(workId)
  const currentStatus = getStatus(workId)
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Private room modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [roomActionError, setRoomActionError] = useState('')
  const [roomActionLoading, setRoomActionLoading] = useState(false)

  // Split rooms: joined vs locked
  const joinedRooms = allBookRooms.filter((r) => r.members?.includes(username))
  const lockedRooms = allBookRooms.filter((r) => !r.members?.includes(username))

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return
    if (!username) { setRoomActionError('Set a username first (join any discussion room to set one)'); return }
    setRoomActionLoading(true)
    setRoomActionError('')
    try {
      const { id } = await createRoom({ bookWorkId: workId, bookTitle: book.title, roomName: roomName.trim(), username })
      setShowCreateModal(false)
      setRoomName('')
      navigate(`/private-room/${id}`)
    } catch {
      setRoomActionError('Failed to create room. Please try again.')
    } finally {
      setRoomActionLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return
    if (!username) { setRoomActionError('Set a username first (join any discussion room to set one)'); return }
    setRoomActionLoading(true)
    setRoomActionError('')
    try {
      const room = await joinByCode(joinCode, username)
      setShowJoinModal(false)
      setJoinCode('')
      navigate(`/private-room/${room.id}`)
    } catch (e) {
      setRoomActionError(e.message || 'Invalid invite code.')
    } finally {
      setRoomActionLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function fetchBook() {
      setLoading(true)
      setError(null)

      try {
        // Fetch work + editions in parallel
        const [workData, editionsData] = await Promise.all([
          cachedFetch(`https://openlibrary.org/works/${workId}.json`,
            { headers: { 'User-Agent': 'BookClub App (dev@bookclub.app)' } }),
          cachedFetch(`https://openlibrary.org/works/${workId}/editions.json?limit=1`,
            { headers: { 'User-Agent': 'BookClub App (dev@bookclub.app)' } }).catch(() => null),
        ])

        if (cancelled) return

        const firstEdition = editionsData?.entries?.[0]
        const pageCount = firstEdition?.number_of_pages ?? null

        const authorRefs = workData.authors ?? []

        // Fetch all authors + Google Books description in parallel
        const authorPromises = authorRefs.slice(0, 3).map((ref) => {
          const authorKey = ref.author?.key
          if (!authorKey) return Promise.resolve(null)
          return cachedFetch(`https://openlibrary.org${authorKey}.json`,
            { headers: { 'User-Agent': 'BookClub App (dev@bookclub.app)' } })
            .then((data) => data.name ?? null)
            .catch(() => null)
        })

        const gbPromise = (async () => {
          try {
            const titleForQuery = workData.title
            const gbQuery = encodeURIComponent(titleForQuery)
            const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API
            const data = await cachedFetch(
              `https://www.googleapis.com/books/v1/volumes?q=${gbQuery}&langRestrict=en&maxResults=3&fields=items(volumeInfo(description,imageLinks))&key=${apiKey}`
            )
            const match = data.items?.find((item) => item.volumeInfo?.description)
            return {
              description: match?.volumeInfo?.description ?? null,
              coverUrl: (() => {
                const links = match?.volumeInfo?.imageLinks
                const raw = links?.extraLarge ?? links?.large ?? links?.medium ?? links?.thumbnail ?? null
                if (!raw) return null
                return raw.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=0')
              })(),
            }
          } catch {
            return { description: null, coverUrl: null }
          }
        })()

        // Wait for everything at once
        const results = await Promise.all([...authorPromises, gbPromise])

        if (cancelled) return

        const authorNames = results.slice(0, authorRefs.slice(0, 3).length).filter(Boolean)
        const gbResult = results[results.length - 1]
        let description = gbResult?.description ?? null
        const gbCoverUrl = gbResult?.coverUrl ?? null

        // Fall back to Open Library description
        if (!description) {
          const raw =
            typeof workData.description === 'string'
              ? workData.description
              : workData.description?.value ?? null
          description = raw?.trim() || null
        }

        if (!description) {
          description = 'No description available for this book.'
        }

        setBook({
          title: workData.title,
          description,
          coverId: workData.covers?.[0] ?? null,
          gbCoverUrl,
          subjects: workData.subjects?.slice(0, 8) ?? [],
          firstPublishYear: workData.first_publish_date ?? null,
          pageCount,
          authors: authorNames,
        })
      } catch (err) {
        if (!cancelled) setError('Could not load book details. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBook()
    return () => { cancelled = true }
  }, [workId])

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-skeleton">
          <div className="skeleton-cover" />
          <div className="skeleton-info">
            <div className="skeleton-line wide" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
            <div className="skeleton-line wide" />
            <div className="skeleton-line wide" />
            <div className="skeleton-line medium" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="detail-page">
        <p className="detail-error">{error}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    )
  }

  // Prefer Google Books cover (higher quality), fall back to Open Library
  const coverUrl = book.gbCoverUrl
    ?? (book.coverId ? `${COVER_BASE}/${book.coverId}-L.jpg` : null)

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="detail-content">
        <div className="detail-cover-col">
          {coverUrl ? (
            <img src={coverUrl} alt={`Cover of ${book.title}`} className="detail-cover" />
          ) : (
            <div className="detail-cover-placeholder">
              <span>📖</span>
            </div>
          )}
        </div>

        <div className="detail-info-col">
          <h1 className="detail-title">{book.title}</h1>

          {book.authors.length > 0 && (
            <p className="detail-authors">by {book.authors.join(', ')}</p>
          )}

          <div className="detail-meta">
            {book.firstPublishYear && (
              <div className="detail-meta-item">
                <span className="meta-label">First Published</span>
                <span className="meta-value">{book.firstPublishYear}</span>
              </div>
            )}
            {book.pageCount > 0 && (
              <div className="detail-meta-item">
                <span className="meta-label">Pages</span>
                <span className="meta-value">{book.pageCount}</span>
              </div>
            )}
          </div>

          <div className="detail-actions">
            <button
              className={`library-btn ${inLibrary ? 'in-library' : ''}`}
              onClick={() => {
                if (inLibrary) {
                  removeBook(workId)
                } else {
                  addBook({
                    workId,
                    title: book.title,
                    authors: book.authors,
                    coverId: book.coverId,
                    firstPublishYear: book.firstPublishYear,
                    pageCount: book.pageCount,
                  })
                }
              }}
            >
              {inLibrary ? '✓ In My Library' : '+ Add to My Library'}
            </button>
          </div>

          {/* Reading status selector */}
          <div className="status-section">
            <h2 className="section-heading">Reading Status</h2>
            <div className="status-buttons">
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  className={`status-btn ${currentStatus === s.key ? 'status-btn--active' : ''}`}
                  style={currentStatus === s.key ? { borderColor: s.color, color: s.color } : {}}
                  onClick={() => currentStatus === s.key ? clearStatus(workId) : setStatus(workId, s.key)}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discussion rooms */}
          <div className="rooms-section">
            <h2 className="section-heading">Discussion Rooms</h2>
            <div className="room-cards">
              {STATUSES.map((s) => {
                const isMyRoom = currentStatus === s.key
                const canEnter = isMyRoom || currentStatus === 'finished'
                return (
                  <button
                    key={s.key}
                    className={`room-card ${isMyRoom ? 'room-card--active' : ''} ${canEnter && !isMyRoom ? 'room-card--visitable' : ''}`}
                    style={isMyRoom ? { borderColor: s.color } : canEnter ? { borderColor: '#3a3a5a' } : {}}
                    onClick={() => {
                      if (!canEnter) return
                      sessionStorage.setItem(`book_title_${workId}`, book.title)
                      navigate(`/room/${workId}/${s.key}`)
                    }}
                    disabled={!canEnter}
                    title={!currentStatus ? 'Set a reading status to join a room' : !canEnter ? `Only available to ${s.label} readers` : ''}
                  >
                    <span className="room-card-emoji">{s.emoji}</span>
                    <span className="room-card-label">{s.label}</span>
                    {isMyRoom && <span className="room-card-join">Join →</span>}
                    {!isMyRoom && canEnter && <span className="room-card-visit">Visit →</span>}
                    {!canEnter && <span className="room-card-locked">🔒</span>}
                  </button>
                )
              })}
            </div>
            {!currentStatus && (
              <p className="rooms-hint">Set a reading status above to join a discussion room.</p>
            )}
          </div>

          <DescriptionBlock description={book.description} />

          {/* Private rooms */}
          <div className="rooms-section">
            <h2 className="section-heading">Private Rooms</h2>

            {joinedRooms.length > 0 && (
              <div className="private-room-list">
                {joinedRooms.map((room) => (
                  <button
                    key={room.id}
                    className="private-room-row"
                    onClick={() => navigate(`/private-room/${room.id}`)}
                  >
                    <span className="private-room-icon">🔒</span>
                    <span className="private-room-name">{room.name}</span>
                    <span className="private-room-members">{room.members?.length ?? 1} member{room.members?.length !== 1 ? 's' : ''}</span>
                    <span className="room-card-join">Enter →</span>
                  </button>
                ))}
              </div>
            )}

            {lockedRooms.length > 0 && (
              <div className="private-room-list">
                {lockedRooms.map((room) => (
                  <div key={room.id} className="private-room-row private-room-row--locked">
                    <span className="private-room-icon">🔒</span>
                    <span className="private-room-name">{room.name}</span>
                    <span className="private-room-members">{room.members?.length ?? 1} member{room.members?.length !== 1 ? 's' : ''}</span>
                    <span className="private-room-locked-label">Members only</span>
                  </div>
                ))}
              </div>
            )}

            <div className="private-room-actions">
              <button className="private-room-btn" onClick={() => { setShowCreateModal(true); setRoomActionError('') }}>
                + Create Private Room
              </button>
              <button className="private-room-btn private-room-btn--secondary" onClick={() => { setShowJoinModal(true); setRoomActionError('') }}>
                Enter Invite Code
              </button>
            </div>
          </div>

          {inLibrary && <ReviewBlock workId={workId} />}
        </div>
      </div>

      {/* Create private room modal */}
      {showCreateModal && (
        <div className="username-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="username-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Private Room</h2>
            <p>Give your room a name. Share the invite code with friends.</p>
            <input
              className="username-input"
              placeholder="Room name (e.g. Book Club with Friends)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              autoFocus
              maxLength={48}
            />
            {roomActionError && <p className="room-action-error">{roomActionError}</p>}
            <button className="username-save-btn" onClick={handleCreateRoom} disabled={!roomName.trim() || roomActionLoading}>
              {roomActionLoading ? 'Creating…' : 'Create Room'}
            </button>
            <button className="review-cancel-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Join private room modal */}
      {showJoinModal && (
        <div className="username-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="username-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Join Private Room</h2>
            <p>Enter the 6-character invite code shared with you.</p>
            <input
              className="username-input"
              placeholder="Invite code (e.g. XK9F2A)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              autoFocus
              maxLength={6}
              style={{ letterSpacing: '3px', fontFamily: 'monospace', fontSize: '1.2rem' }}
            />
            {roomActionError && <p className="room-action-error">{roomActionError}</p>}
            <button className="username-save-btn" onClick={handleJoinRoom} disabled={joinCode.length < 6 || roomActionLoading}>
              {roomActionLoading ? 'Joining…' : 'Join Room'}
            </button>
            <button className="review-cancel-btn" onClick={() => setShowJoinModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookDetailPage
