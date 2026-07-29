import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Footer from './components/Footer.jsx'
import GameModal from './components/GameModal.jsx'
import DayPage from './pages/DayPage.jsx'
import { GAMES } from './data/games.js'

export const DAYS = [
  { id: 'mon', label: '월요일', icon: '🚀' },
  { id: 'tue', label: '화요일', icon: '🔥' },
  { id: 'wed', label: '수요일', icon: '💧' },
  { id: 'thu', label: '목요일', icon: '🌳' },
  { id: 'fri', label: '금요일', icon: '⭐' },
  { id: 'sat', label: '토요일', icon: '🎉' },
]

export default function App() {
  const [dayIndex, setDayIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => new Set(GAMES.map((g) => g.id)))
  const [selectedGame, setSelectedGame] = useState(null)

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const day = DAYS[dayIndex]
  const featured = GAMES[dayIndex % GAMES.length]
  const cards = Array.from({ length: 4 }, (_, i) => GAMES[(dayIndex + 1 + i) % GAMES.length])

  return (
    <div className="app">
      <Sidebar
        days={DAYS}
        dayIndex={dayIndex}
        open={sidebarOpen}
        onNavigate={(i) => {
          setDayIndex(i)
          setSidebarOpen(false)
        }}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <main className="main">
        <header className="page-header">
          <button
            type="button"
            className="hamburger"
            aria-label="메뉴 열기"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div>
            <h1 className="page-title">늘봄교육</h1>
            <p className="page-subtitle">{day.label}의 신나는 히어로 게임으로 실력을 뽐내봐요!</p>
          </div>
        </header>
        <DayPage
          featured={featured}
          cards={cards}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onSelect={setSelectedGame}
        />
        <Footer />
      </main>
      {selectedGame && (
        <GameModal
          game={selectedGame}
          isFavorite={favorites.has(selectedGame.id)}
          onToggleFavorite={toggleFavorite}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  )
}
