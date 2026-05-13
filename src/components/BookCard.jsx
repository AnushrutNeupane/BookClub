import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useReviews } from '../hooks/useReviews'
import StarRating from './StarRating'
import './BookCard.css'

function HoverTooltip({ review, anchorRect }) {
  if (!anchorRect) return null

  const tooltipWidth = 200
  const left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2
  const top = anchorRect.top + window.scrollY - 8

  const style = {
    position: 'absolute',
    top,
    left: Math.max(8, left),
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
        <p className="tooltip-no-rating">No review yet</p>
      )}
    </div>,
    document.body
  )
}

function BookCard({ book }) {
  const navigate = useNavigate()
  const { getReview } = useReviews()
  const [anchorRect, setAnchorRect] = useState(null)
  const cardRef = useRef(null)
  const hoverTimer = useRef(null)

  const {
    key,
    id,
    title,
    author_name,
    number_of_pages_median,
    coverUrl,
    first_publish_year,
  } = book

  const bookId = id ?? key
  const authors = Array.isArray(author_name)
    ? author_name.slice(0, 2).join(', ')
    : (author_name ?? 'Unknown Author')
  const review = bookId ? getReview(bookId) : null

  const handleClick = () => {
    if (bookId) navigate(`/book/${bookId}`)
  }

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      if (cardRef.current) setAnchorRect(cardRef.current.getBoundingClientRect())
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
          <img src={coverUrl} alt={`Cover of ${title}`} className="book-cover" loading="lazy" />
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

      {bookId && <HoverTooltip review={review} anchorRect={anchorRect} />}
    </div>
  )
}

export default BookCard
