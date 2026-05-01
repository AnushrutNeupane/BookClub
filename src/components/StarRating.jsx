import { useState } from 'react'
import './StarRating.css'

// display-only mode when onChange is not provided
function StarRating({ value, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(0)
  const interactive = !!onChange

  return (
    <div className={`star-rating star-rating--${size} ${interactive ? 'interactive' : ''}`}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Rating' : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (interactive ? (hovered || value) : value)
        return (
          <button
            key={star}
            type="button"
            className={`star ${filled ? 'filled' : ''}`}
            onClick={interactive ? () => onChange(star) : undefined}
            onMouseEnter={interactive ? () => setHovered(star) : undefined}
            onMouseLeave={interactive ? () => setHovered(0) : undefined}
            aria-label={interactive ? `${star} star${star !== 1 ? 's' : ''}` : undefined}
            tabIndex={interactive ? 0 : -1}
            disabled={!interactive}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export default StarRating
