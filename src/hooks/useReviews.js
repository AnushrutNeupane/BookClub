import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bookclub_reviews'

function loadReviews() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveReviews(reviews) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
}

const listeners = new Set()

function notifyAll(reviews) {
  listeners.forEach((fn) => fn(reviews))
}

export function useReviews() {
  const [reviews, setReviews] = useState(loadReviews)

  useEffect(() => {
    const handler = (r) => setReviews(r)
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])

  // Save or update a review for a workId
  const saveReview = (workId, { rating, text }) => {
    const current = loadReviews()
    const updated = {
      ...current,
      [workId]: { rating, text, updatedAt: new Date().toISOString() },
    }
    saveReviews(updated)
    notifyAll(updated)
  }

  const deleteReview = (workId) => {
    const current = loadReviews()
    const { [workId]: _, ...rest } = current
    saveReviews(rest)
    notifyAll(rest)
  }

  const getReview = (workId) => reviews[workId] ?? null

  return { reviews, saveReview, deleteReview, getReview }
}
