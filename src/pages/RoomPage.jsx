import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useUsername } from '../hooks/useUsername'
import { useReadingStatus, STATUSES } from '../hooks/useReadingStatus'
import { UserName } from '../components/UserProfilePopup'
import './RoomPage.css'

function formatTime(ts) {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function UsernamePrompt({ onSave }) {
  const [value, setValue] = useState('')
  return (
    <div className="username-overlay">
      <div className="username-modal">
        <h2>What should we call you?</h2>
        <p>Pick a display name to use in discussion rooms.</p>
        <input
          className="username-input"
          type="text"
          placeholder="Your name..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSave(value)}
          autoFocus
          maxLength={32}
        />
        <button
          className="username-save-btn"
          onClick={() => value.trim() && onSave(value)}
          disabled={!value.trim()}
        >
          Enter Room
        </button>
      </div>
    </div>
  )
}

function RoomPage() {
  const { workId, status } = useParams()
  const navigate = useNavigate()
  const { username, setUsername } = useUsername()
  const { getStatus } = useReadingStatus()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [bookTitle, setBookTitle] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const statusInfo = STATUSES.find((s) => s.key === status)
  const userStatus = getStatus(workId)
  const isFinished = userStatus === 'finished'
  const isVisitingOtherRoom = isFinished && userStatus !== status
  const [spoilerAcknowledged, setSpoilerAcknowledged] = useState(false)

  // Pull book title from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`book_title_${workId}`)
    if (stored) setBookTitle(stored)
  }, [workId])

  // Subscribe to messages for this status room
  useEffect(() => {
    const q = query(
      collection(db, 'rooms', workId, status),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [workId, status])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'rooms', workId, status), {
        text: trimmed,
        username,
        createdAt: serverTimestamp(),
      })
      setText('')
    } catch (e) {
      console.error('Failed to send message:', e)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  if (!username) {
    return <UsernamePrompt onSave={setUsername} />
  }

  // Block access if user's status doesn't match — unless they're finished
  if (userStatus !== status && !isFinished) {
    return (
      <div className="room-page">
        <div className="room-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <div className="room-blocked">
          <span className="blocked-icon">{statusInfo?.emoji ?? '🔒'}</span>
          <h2>This room is for {statusInfo?.label ?? status} readers</h2>
          <p>
            {userStatus
              ? `You're currently in the "${STATUSES.find(s => s.key === userStatus)?.label}" room for this book.`
              : "You haven't set a reading status for this book yet."}
          </p>
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Go back to book
          </button>
        </div>
      </div>
    )
  }

  // Spoiler warning for finished users entering a non-finished room
  if (isVisitingOtherRoom && !spoilerAcknowledged) {
    return (
      <div className="username-overlay">
        <div className="username-modal spoiler-modal">
          <span className="spoiler-icon">⚠️</span>
          <h2>Spoiler Warning</h2>
          <p>
            You've finished this book, but you're about to enter the{' '}
            <strong style={{ color: statusInfo?.color }}>{statusInfo?.emoji} {statusInfo?.label}</strong> room.
          </p>
          <p>Other readers in this room may not have finished yet. Please be mindful and <strong>don't post spoilers</strong>.</p>
          <button className="username-save-btn" onClick={() => setSpoilerAcknowledged(true)}>
            I understand, enter room
          </button>
          <button className="review-cancel-btn" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="room-page">
      <div className="room-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="room-header-info">
          <h1 className="room-title">
            {bookTitle || 'Book Discussion'}
          </h1>
          <p className="room-subtitle">
            <span className="room-status-badge" style={{ color: statusInfo?.color }}>
              {statusInfo?.emoji} {statusInfo?.label}
            </span>
            {isVisitingOtherRoom && (
              <span className="room-visiting-badge">👀 visiting as Finished reader</span>
            )}
            · chatting as <strong>{username}</strong>
            <button className="change-name-btn" onClick={() => setUsername('')}>change</button>
          </p>
        </div>
      </div>

      <div className="room-messages">
        {messages.length === 0 && (
          <div className="room-empty">
            <p>No messages yet. Start the discussion!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.username === username ? 'message--own' : ''}`}
          >
            <div className="message-meta">
              <UserName
                username={msg.username}
                workId={workId}
                isSelf={msg.username === username}
              />
              <span className="message-time">{formatTime(msg.createdAt)}</span>
            </div>
            <div className="message-bubble">
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="room-input-bar">
        <input
          ref={inputRef}
          className="room-input"
          type="text"
          placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          maxLength={1000}
          disabled={sending}
        />
        <button
          className="room-send-btn"
          onClick={sendMessage}
          disabled={!text.trim() || sending}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default RoomPage
