import { useState } from 'react'
import HeroBanner from '../components/HeroBanner.jsx'
import GameCard from '../components/GameCard.jsx'
import { ABILITIES } from '../data/games.js'

export default function DayPage({ featured, cards, favorites, onToggleFavorite, onSelect }) {
  const [filter, setFilter] = useState(null)
  const games = filter ? cards.filter((g) => g.abilities.includes(filter)) : cards

  return (
    <>
      <HeroBanner game={featured} onSelect={onSelect} />
      <div className="section-row">
        <h2 className="section-title">오늘의 게임</h2>
        <div className="filter-row" role="group" aria-label="능력별 필터">
          {Object.entries(ABILITIES).map(([key, { label, icon }]) => (
            <button
              key={key}
              type="button"
              className={`filter-chip${filter === key ? ' is-active' : ''}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(filter === key ? null : key)}
            >
              <span aria-hidden="true">{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>
      {games.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">🔍</span>
          <p>이 능력의 게임이 오늘은 없어요.</p>
          <p className="empty-hint">다른 요일이나 다른 능력을 골라보세요!</p>
        </div>
      ) : (
        <div className="game-grid">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isFavorite={favorites.has(game.id)}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </>
  )
}
