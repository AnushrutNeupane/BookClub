import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BookGrid from '../components/BookGrid'
import { cachedFetch } from '../utils/cache'
import { useLibrary } from '../hooks/useLibrary'
import './HomePage.css'

// Curated subjects to pull popular books from
const SECTIONS = [
  { label: 'Trending', subject: 'fiction' },
  { label: 'Fantasy', subject: 'fantasy' },
  { label: 'Science Fiction', subject: 'science_fiction' },
  { label: 'Mystery', subject: 'mystery_and_detective_stories' },
]

function useSubjectBooks(subject) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchBooks() {
      setLoading(true)
      try {
        const data = await cachedFetch(
          `https://openlibrary.org/subjects/${subject}.json?limit=12`,
          { headers: { 'User-Agent': 'BookClub App (dev@bookclub.app)' } }
        )
        if (cancelled) return

        const normalized = (data.works || []).map((w) => ({
          key: w.key,
          title: w.title,
          author_name: w.authors?.map((a) => a.name),
          cover_i: w.cover_id,
          first_publish_year: w.first_publish_year,
          number_of_pages_median: null,
        }))

        setBooks(normalized)
      } catch {
        setBooks([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBooks()
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
              key: `/works/${b.workId}`,
              title: b.title,
              author_name: b.authors,
              cover_i: b.coverId,
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
