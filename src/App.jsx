import { Routes, Route, NavLink } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import BookDetailPage from './pages/BookDetailPage'
import LibraryPage from './pages/LibraryPage'
import RoomPage from './pages/RoomPage'
import PrivateRoomPage from './pages/PrivateRoomPage'
import ProfilePage from './pages/ProfilePage'
import { useUsername } from './hooks/useUsername'
import { useSyncUserProfile } from './hooks/useUserProfile'
import './App.css'

function App() {
  const { username } = useUsername()
  useSyncUserProfile()
  const initials = username
    ? username.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <NavLink to="/" className="logo-link">
            <h1 className="logo">📚 BookClub</h1>
          </NavLink>
          <nav className="app-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Home
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Search
            </NavLink>
            <NavLink to="/library" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              My Library
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link nav-link--avatar ${isActive ? 'active' : ''}`}>
              <span className="nav-avatar">{initials}</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/book/:workId" element={<BookDetailPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/room/:workId/:status" element={<RoomPage />} />
          <Route path="/private-room/:roomId" element={<PrivateRoomPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <span className="bottom-nav-icon">🏠</span>
          Home
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <span className="bottom-nav-icon">🔍</span>
          Search
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <span className="bottom-nav-icon">📚</span>
          Library
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <span className="bottom-nav-avatar">{initials}</span>
          Profile
        </NavLink>
      </nav>
    </div>
  )
}

export default App
