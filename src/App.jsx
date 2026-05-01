import { Routes, Route, NavLink } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import BookDetailPage from './pages/BookDetailPage'
import LibraryPage from './pages/LibraryPage'
import RoomPage from './pages/RoomPage'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="logo">📚 BookClub</h1>
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
        </Routes>
      </main>
    </div>
  )
}

export default App
