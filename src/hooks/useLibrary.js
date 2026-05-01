import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bookclub_library'

function loadLibrary() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveLibrary(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
}

// Module-level listeners so all hook instances stay in sync
const listeners = new Set()

function notifyAll(books) {
  listeners.forEach((fn) => fn(books))
}

export function useLibrary() {
  const [library, setLibrary] = useState(loadLibrary)

  useEffect(() => {
    const handler = (books) => setLibrary(books)
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])

  const addBook = (book) => {
    const current = loadLibrary()
    if (current.some((b) => b.workId === book.workId)) return
    const updated = [book, ...current]
    saveLibrary(updated)
    notifyAll(updated)
  }

  const removeBook = (workId) => {
    const updated = loadLibrary().filter((b) => b.workId !== workId)
    saveLibrary(updated)
    notifyAll(updated)
  }

  const isInLibrary = (workId) => library.some((b) => b.workId === workId)

  return { library, addBook, removeBook, isInLibrary }
}
