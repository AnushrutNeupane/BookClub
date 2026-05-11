import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { fetchUserProfile } from '../hooks/useUserProfile'
import { STATUSES } from '../hooks/useReadingStatus'
import StarRating from './StarRating'
import './UserProfilePopup.css'

const COVER_BASE = 'https://covers.openlibrary.org/b/id'

// Full profile modal shown on click
function ProfileModal({ username, workId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserProfile(username).then((p) => {
      setProfile(p)
      setLoading(false)
    })
  }, [username])

  const initials = username
    ? username.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const bookStatus = workId && profile?.statuses?.[workId]
    ? STATUSES.find((s) => s.key === profile.statuses[workId])
    : null

  const reviewList = profile?.reviews
    ? Object.entries(profile.reviews).map(([wId, r]) => ({ workId: wId, ...r }))
    : []

  const avgRating = reviewList.length > 0
    ? (reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length).toFixed(1)
    : null

  return createPortal(
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose}>✕</button>

        <div className="profile-modal-header">
          <div className="profile-modal-avatar">{initials}</div>
          <div>
            <h2 className="profile-modal-name">{username}</h2>
            {bookStatus && (
              <p className="profile-modal-status" style={{ color: bookStatus.color }}>
                {bookStatus.emoji} {bookStatus.label} this book
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <p className="profile-modal-loading">Loading profile…</p>
        ) : !profile ? (
          <p className="profile-modal-empty">No profile data available yet.</p>
        ) : (
          <>
            <div className="profile-modal-stats">
              <div className="profile-modal-stat">
                <span className="pms-value">{profile.library?.length ?? 0}</span>
                <span className="pms-label">Books</span>
              </div>
              <div className="profile-modal-stat">
                <span className="pms-value">{reviewList.length}</span>
                <span className="pms-label">Reviews</span>
              </div>
              {avgRating && (
                <div className="profile-modal-stat">
                  <span className="pms-value">⭐ {avgRating}</span>
                  <span className="pms-label">Avg Rating</span>
                </div>
              )}
              <div className="profile-modal-stat">
                <span className="pms-value">
                  {Object.values(profile.statuses ?? {}).filter((s) => s === 'finished').length}
                </span>
                <span className="pms-label">Finished</span>
              </div>
            </div>

            {profile.library?.length > 0 && (
              <div className="profile-modal-section">
                <p className="profile-modal-section-label">Library</p>
                <div className="profile-modal-books">
                  {profile.library.slice(0, 8).map((book) => {
                    const coverUrl = book.coverId
                      ? `${COVER_BASE}/${book.coverId}-M.jpg`
                      : null
                    const status = profile.statuses?.[book.workId]
                    const statusInfo = status ? STATUSES.find((s) => s.key === status) : null
                    const review = profile.reviews?.[book.workId]
                    return (
                      <div key={book.workId} className="profile-modal-book">
                        <div className="pmb-cover-wrapper">
                          {coverUrl
                            ? <img src={coverUrl} alt={book.title} className="pmb-cover" loading="lazy" />
                            : <div className="pmb-cover-placeholder">📖</div>
                          }
                          {statusInfo && (
                            <span className="pmb-status-badge" title={statusInfo.label}>
                              {statusInfo.emoji}
                            </span>
                          )}
                        </div>
                        <p className="pmb-title">{book.title}</p>
                        {review && <StarRating value={review.rating} size="sm" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// Hover tooltip shown on mouse-over
function ProfileTooltip({ username, workId, anchorRect }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!anchorRect) return
    let cancelled = false
    setLoading(true)
    fetchUserProfile(username).then((p) => {
      if (!cancelled) { setProfile(p); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [anchorRect, username])

  if (!anchorRect) return null

  const tooltipWidth = 220
  const left = Math.max(8, Math.min(
    anchorRect.left,
    window.innerWidth - tooltipWidth - 8
  ))
  const top = anchorRect.bottom + window.scrollY + 6

  const style = { position: 'absolute', top, left, width: tooltipWidth, zIndex: 9999 }

  const bookStatus = workId && profile?.statuses?.[workId]
    ? STATUSES.find((s) => s.key === profile.statuses[workId])
    : null

  const reviewList = profile?.reviews
    ? Object.entries(profile.reviews).map(([wId, r]) => ({ workId: wId, ...r }))
    : []

  const avgRating = reviewList.length > 0
    ? (reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length).toFixed(1)
    : null

  return createPortal(
    <div className="user-tooltip" style={style}>
      <p className="user-tooltip-name">{username}</p>
      {loading ? (
        <p className="user-tooltip-loading">Loading…</p>
      ) : !profile ? (
        <p className="user-tooltip-loading">No data yet</p>
      ) : (
        <>
          {bookStatus && (
            <p className="user-tooltip-status" style={{ color: bookStatus.color }}>
              {bookStatus.emoji} {bookStatus.label} this book
            </p>
          )}
          <div className="user-tooltip-stats">
            <span>{profile.library?.length ?? 0} books</span>
            {avgRating && <span>⭐ {avgRating}</span>}
          </div>
        </>
      )}
      <p className="user-tooltip-hint">Click to view profile</p>
    </div>,
    document.body
  )
}

// The main export — wraps a username with hover + click behaviour
export function UserName({ username, workId, isSelf }) {
  const [anchorRect, setAnchorRect] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const hoverTimer = useRef(null)
  const spanRef = useRef(null)

  if (isSelf) return <span className="message-author message-author--self">{username}</span>

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      if (spanRef.current) setAnchorRect(spanRef.current.getBoundingClientRect())
    }, 400)
  }

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    setAnchorRect(null)
  }

  const handleClick = () => {
    setAnchorRect(null)
    setShowModal(true)
  }

  return (
    <>
      <span
        ref={spanRef}
        className="message-author message-author--clickable"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        {username}
      </span>

      <ProfileTooltip username={username} workId={workId} anchorRect={anchorRect} />

      {showModal && (
        <ProfileModal
          username={username}
          workId={workId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
