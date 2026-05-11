import { useEffect } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useUsername } from './useUsername'
import { useLibrary } from './useLibrary'
import { useReviews } from './useReviews'
import { useReadingStatus } from './useReadingStatus'

// Syncs the current user's data to Firestore so others can view their profile.
// Call this once at the app level (or in each page that mutates data).
export function useSyncUserProfile() {
  const { username } = useUsername()
  const { library } = useLibrary()
  const { reviews } = useReviews()
  const { } = useReadingStatus() // just to trigger re-renders

  useEffect(() => {
    if (!username) return

    // Read statuses directly from localStorage to avoid hook dependency issues
    let statuses = {}
    try {
      const raw = localStorage.getItem('bookclub_reading_status')
      if (raw) statuses = JSON.parse(raw)
    } catch {}

    const profileData = {
      username,
      library,
      reviews,
      statuses,
      updatedAt: new Date().toISOString(),
    }

    // Fire-and-forget — don't block the UI
    setDoc(doc(db, 'users', username), profileData, { merge: true }).catch(() => {})
  }, [username, library, reviews])
}

// Fetch another user's profile from Firestore (one-time read)
export async function fetchUserProfile(username) {
  if (!username) return null
  try {
    const snap = await getDoc(doc(db, 'users', username))
    if (!snap.exists()) return null
    return snap.data()
  } catch {
    return null
  }
}
