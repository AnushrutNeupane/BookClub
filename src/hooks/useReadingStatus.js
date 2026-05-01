import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bookclub_reading_status'

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const listeners = new Set()
function notifyAll(data) { listeners.forEach((fn) => fn(data)) }

export const STATUSES = [
  { key: 'interested', label: 'Interested', emoji: '🔖', color: '#a0c4ff' },
  { key: 'reading',    label: 'Reading',    emoji: '📖', color: '#f5a623' },
  { key: 'finished',   label: 'Finished',   emoji: '✅', color: '#4caf82' },
]

export function useReadingStatus() {
  const [statuses, setStatuses] = useState(load)

  useEffect(() => {
    const handler = (d) => setStatuses(d)
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])

  const setStatus = (workId, status) => {
    const current = load()
    const updated = { ...current, [workId]: status }
    save(updated)
    notifyAll(updated)
  }

  const clearStatus = (workId) => {
    const current = load()
    const { [workId]: _, ...rest } = current
    save(rest)
    notifyAll(rest)
  }

  const getStatus = (workId) => statuses[workId] ?? null

  return { setStatus, clearStatus, getStatus }
}
