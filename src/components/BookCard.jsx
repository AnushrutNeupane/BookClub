import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useReviews } from '../hooks/useReviews'
import { getGoogleBooksCover } from '../utils/getBookCover'
import StarRating from './StarRating'
import './BookCard.css'

const COVER_BASE = 'https://covers.openlibrary.org/b/id'

const ratingsCache = new Map()

async function fetchRating(workId) {
  if (ratingsCache.has(workId)) return ratingsCache.get(workId)
  try {
    const res = await fetch(`https://openlibrary.org/works/${workId}/ratings.json`, {
      headers: { 'User-Agent': 'BookClub App (dev@bookclub.app)' },
    })
    if (!res.ok) throw new Error()
    const data = await res.json()
    const result = {
      average: data.summary?.average ?? null,
      count: data.summary?.count ?? 0,
    }
    ratingsCache.set(workId, result)
    return result
  } catch {
    ratingsCache.set(workId, null)
    return null
  }
}

function HoverTooltip({ workId, review, anchorRect }) {
  const [communityRating, setCommunityRating] = useState(null)
  const [loadingRating, setLoadingRating] = useState(false)

  useEffect(() => {
    if (!anchorRect || review) return
    let cancelled = false
    setLoadingRating(true)
    fetchRating(workId).then((r) => {
      if (!cancelled) {
        setCommunityRating(r)
        setLoadingRating(false)
      }
    })
    return () => { cancelled = true }
  }, [anchorRect, workId, review])

  if (!anchorRect) return null

  // Position above the card, centered horizontally
  const tooltipWidth = 200
  const left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2
  const top = anchorRect.top + window.scrollY - 8 // 8px gap above card

  const style = {
    position: 'absolute',
    top,
    left: Math.max(8, left), // don't go off left edge
    width: tooltipWidth,
    transform: 'translateY(-100%)',
    zIndex: 9999,
  }

  return createPortal(
    <div className="book-tooltip" style={style} role="tooltip">
      {review ? (
        <>
          <p className="tooltip-label">Your review</p>
          <StarRating value={review.rating} size="sm" />
          {review.text && <p className="tooltip-review-text">{review.text}</p>}
        </>
      ) : (
        <>
          <p className="tooltip-label">Community rating</p>
          {loadingRating ? (
            <p className="tooltip-loading">Loading…</p>
          ) : communityRating?.average ? (
            <>
              <div className="tooltip-community-rating">
                <StarRating value={Math.round(communityRating.average)} size="sm" />
                <span className="tooltip-avg">{communityRating.average.toFixed(1)}</span>
              </div>
              <p className="tooltip-count">{communityRating.count.toLocaleString()} ratings</p>
            </>
          ) : (
            <p className="tooltip-no-rating">No ratings yet</p>
          )}
        </>
      )}
    </div>,
    document.body
  )
}

function BookCard({ book }) {
  const navigate = useNavigate()
  const { getReview } = useReviews()
  const [anchorRect, setAnchorRect] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)
  const cardRef = useRef(null)
  const hoverTimer = useRef(null)

  const {
    key,
    title,
    author_name,
    number_of_pages_median,
    cover_i,
    first_publish_year,
  } = book

  const olCoverUrl = cover_i ? `${COVER_BASE}/${cover_i}-M.jpg` : null
  const authors = author_name?.slice(0, 2).join(', ') ?? 'Unknown Author'
  const workId = key?.split('/').pop()
  const review = workId ? getReview(workId) : null

  // Fetch Google Books cover, fall back to Open Library
  useEffect(() => {
    let cancelled = false
    setCoverUrl(olCoverUrl) // show OL cover immediately while fetching
    getGoogleBooksCover(title, author_name?.[0]).then((url) => {
      if (!cancelled) setCoverUrl(url ?? olCoverUrl)
    })
    return () => { cancelled = true }
  }, [title, author_name?.[0], cover_i])

  const handleClick = () => {
    if (workId) navigate(`/book/${workId}`)
  }

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      if (cardRef.current) {
        setAnchorRect(cardRef.current.getBoundingClientRect())
      }
    }, 400)
  }

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    setAnchorRect(null)
  }

  return (
    <div
      ref={cardRef}
      className="book-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="book-cover-wrapper">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Cover of ${title}`}
            className="book-cover"
            loading="lazy"
          />
        ) : (
          <div className="book-cover-placeholder">
            <span className="placeholder-icon">📖</span>
          </div>
        )}
      </div>

      <div className="book-info">
        <h3 className="book-title" title={title}>{title}</h3>
        <p className="book-author">{authors}</p>

        {review ? (
          <div className="book-review-badge">
            <StarRating value={review.rating} size="sm" />
          </div>
        ) : (
          <div className="book-meta">
            {number_of_pages_median > 0 && (
              <span className="meta-tag">📄 {number_of_pages_median} pages</span>
            )}
            {first_publish_year > 0 && (
              <span className="meta-tag">📅 {first_publish_year}</span>
            )}
          </div>
        )}
      </div>

      {workId && (
        <HoverTooltip workId={workId} review={review} anchorRect={anchorRect} />
      )}
    </div>
  )
}

export default BookCard
