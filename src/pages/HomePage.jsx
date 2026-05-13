import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BookGrid from '../components/BookGrid'
import { fetchSubjectBooks } from '../utils/gbBooks'
import { useLibrary } from '../hooks/useLibrary'
import './HomePage.css'

const SECTIONS = [
  { label: 'Trending Fiction', subject: 'fiction' },
  { label: 'Fantasy', subject: 'fantasy' },
  { label: 'Mystery', subject: 'mystery' },
]

function useSubjectBooks(subject) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSubjectBooks(subject, 12)
      .then((results) => { if (!cancelled) setBooks(results) })
      .catch(() => { if (!cancelled) setBooks([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [subject])

  return { books, loading }
}

function BookSection({ label, subject }) {
  const { books, loading } = useSubjectBooks(subject)
  return (
    <section className="book-section">
      <h2 className="section-title">{label}</h2>
      <BookGrid books={books} loading={loading} />
    </section>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const { library } = useLibrary()

  return (
    <div className="home-page">
      <div className="home-hero">
        <h2 className="hero-title">Welcome to BookClub</h2>
        <p className="hero-subtitle">
          Your community for discovering, discussing, and sharing great books.
        </p>
        <button className="hero-btn" onClick={() => navigate('/search')}>
          Search Books
        </button>
      </div>

      {library.length > 0 && (
        <section className="book-section">
          <div className="section-header">
            <h2 className="section-title">Your Library</h2>
            <button className="section-link" onClick={() => navigate('/library')}>
              View all →
            </button>
          </div>
          <BookGrid
            books={library.slice(0, 6).map((b) => ({
              key: b.workId,
              id: b.workId,
              title: b.title,
              author_name: b.authors,
              coverUrl: b.coverUrl ?? null,
              first_publish_year: b.firstPublishYear,
              number_of_pages_median: b.pageCount,
            }))}
            loading={false}
          />
        </section>
      )}

      {SECTIONS.map((s) => (
        <BookSection key={s.subject} label={s.label} subject={s.subject} />
      ))}
    </div>
  )
}

export default HomePage
