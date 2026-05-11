import { useState, useEffect } from 'react'
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  arrayUnion, arrayRemove, onSnapshot, query, where,
  serverTimestamp, getDocs, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Rooms the current user is a member of
export function usePrivateRooms(username) {
  const [myRooms, setMyRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) { setLoading(false); return }
    const q = query(
      collection(db, 'privateRooms'),
      where('members', 'array-contains', username)
    )
    const unsub = onSnapshot(q, (snap) => {
      setMyRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [username])

  const createRoom = async ({ bookWorkId, bookTitle, roomName, username: creator }) => {
    const inviteCode = generateInviteCode()
    const ref = await addDoc(collection(db, 'privateRooms'), {
      bookWorkId,
      bookTitle,
      name: roomName,
      inviteCode,
      createdBy: creator,
      members: [creator],
      createdAt: serverTimestamp(),
    })
    return { id: ref.id, inviteCode }
  }

  const joinByCode = async (code, username) => {
    const q = query(collection(db, 'privateRooms'), where('inviteCode', '==', code.toUpperCase().trim()))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error('Invalid invite code')
    const roomDoc = snap.docs[0]
    const data = roomDoc.data()
    if (data.members?.includes(username)) throw new Error('You are already in this room')
    await updateDoc(doc(db, 'privateRooms', roomDoc.id), {
      members: arrayUnion(username),
    })
    return { id: roomDoc.id, ...data }
  }

  const kickMember = async (roomId, memberUsername) => {
    await updateDoc(doc(db, 'privateRooms', roomId), {
      members: arrayRemove(memberUsername),
    })
  }

  const deleteRoom = async (roomId) => {
    // Delete all messages then the room doc
    const messagesSnap = await getDocs(collection(db, 'privateRooms', roomId, 'messages'))
    const batch = writeBatch(db)
    messagesSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(db, 'privateRooms', roomId))
    await batch.commit()
  }

  return { myRooms, loading, createRoom, joinByCode, kickMember, deleteRoom }
}

// All rooms for a specific book (for discovery — shows locked rooms too)
export function useBookRooms(workId) {
  const [allRooms, setAllRooms] = useState([])

  useEffect(() => {
    if (!workId) return
    const q = query(collection(db, 'privateRooms'), where('bookWorkId', '==', workId))
    const unsub = onSnapshot(q, (snap) => {
      setAllRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [workId])

  return allRooms
}
