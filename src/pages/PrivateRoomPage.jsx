import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, doc, onSnapshot as onSnap,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useUsername } from '../hooks/useUsername'
import { usePrivateRooms } from '../hooks/usePrivateRooms'
import { UserName } from '../components/UserProfilePopup'
import './RoomPage.css'
import './PrivateRoomPage.css'

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

function PrivateRoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { username, setUsername } = useUsername()
  const { kickMember, deleteRoom } = usePrivateRooms(username)
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const isCreator = room?.createdBy === username

  // Subscribe to room metadata in real time (catches member changes)
  useEffect(() => {
    if (!username) return
    const unsub = onSnap(doc(db, 'privateRooms', roomId), (snap) => {
      if (!snap.exists()) {
        // Room was deleted
        navigate(-1)
        return
      }
      const data = { id: snap.id, ...snap.data() }
      if (!data.members?.includes(username)) {
        setAccessDenied(true)
        setLoadingRoom(false)
        return
      }
      setRoom(data)
      setLoadingRoom(false)
    })
    return unsub
  }, [roomId, username])

  // Subscribe to messages
  useEffect(() => {
    if (!room) return
    const q = query(
      collection(db, 'privateRooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [room, roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'privateRooms', roomId, 'messages'), {
        text: trimmed,
        username,
        createdAt: serverTimestamp(),
      })
      setText('')
    } catch (e) {
      console.error('Failed to send:', e)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKick = async (member) => {
    await kickMember(roomId, member)
  }

  const handleDeleteRoom = async () => {
    await deleteRoom(roomId)
    navigate(-1)
  }

  if (!username) return <UsernamePrompt onSave={setUsername} />

  if (loadingRoom) {
    return (
      <div className="room-page">
        <div className="room-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <div className="room-empty"><p>Loading room…</p></div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="room-page">
        <div className="room-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <div className="room-blocked">
          <span className="blocked-icon">🔒</span>
          <h2>Access Denied</h2>
          <p>You're not a member of this room. Ask the creator for an invite code.</p>
          <button className="back-btn" onClick={() => navigate(-1)}>← Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="room-page">
      <div className="room-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="room-header-info">
          <h1 className="room-title">🔒 {room.name}</h1>
          <p className="room-subtitle">
            <span style={{ color: '#a0c4ff' }}>📖 {room.bookTitle}</span>
            · {room.members?.length ?? 1} member{room.members?.length !== 1 ? 's' : ''}
            · chatting as <strong>{username}</strong>
            <button className="change-name-btn" onClick={() => setUsername('')}>change</button>
          </p>
        </div>
        <div className="room-header-actions">
          <button className="invite-code-btn" onClick={() => { setShowInvite(!showInvite); setShowManage(false) }}>
            Invite Code
          </button>
          {isCreator && (
            <button className="manage-room-btn" onClick={() => { setShowManage(!showManage); setShowInvite(false) }}>
              Manage
            </button>
          )}
        </div>
      </div>

      {showInvite && (
        <div className="invite-banner">
          <span>Share this code to invite others:</span>
          <span className="invite-code">{room.inviteCode}</span>
          <button className="copy-btn" onClick={() => navigator.clipboard.writeText(room.inviteCode)}>
            Copy
          </button>
        </div>
      )}

      {showManage && isCreator && (
        <div className="manage-panel">
          <div className="manage-section">
            <p className="manage-label">Members</p>
            <div className="manage-members">
              {room.members?.map((member) => (
                <div key={member} className="manage-member-row">
                  <span className="manage-member-name">
                    {member}
                    {member === username && <span className="manage-you-badge"> (you)</span>}
                    {member === room.createdBy && <span className="manage-creator-badge"> 👑</span>}
                  </span>
                  {member !== username && (
                    <button
                      className="kick-btn"
                      onClick={() => handleKick(member)}
                    >
                      Kick
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="manage-section manage-danger">
            {!confirmDelete ? (
              <button className="delete-room-btn" onClick={() => setConfirmDelete(true)}>
                🗑 Delete Room
              </button>
            ) : (
              <div className="delete-confirm">
                <p>This will permanently delete the room and all messages. Are you sure?</p>
                <div className="delete-confirm-actions">
                  <button className="delete-room-btn" onClick={handleDeleteRoom}>Yes, delete</button>
                  <button className="review-cancel-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                workId={room?.bookWorkId}
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

export default PrivateRoomPage
