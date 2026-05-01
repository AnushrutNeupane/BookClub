import { useState } from 'react'

const KEY = 'bookclub_username'

export function useUsername() {
  const [username, setUsernameState] = useState(() => localStorage.getItem(KEY) || '')

  const setUsername = (name) => {
    const trimmed = name.trim()
    localStorage.setItem(KEY, trimmed)
    setUsernameState(trimmed)
  }

  return { username, setUsername }
}
