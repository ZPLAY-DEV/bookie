import { ABILITIES } from '../data/games.js'

export default function GameCard({ game, isFavorite, onToggleFavorite, onSelect }) {
  return (
    <article className="game-card">
      <div className="card-body">
        <button type="button" className="card-top" onClick={() => onSelect(game)}>
          <div className="card-thumb" style={{ background: game.scene.bg }}>
            <span className="thumb-main" aria-hidden="true">{game.scene.main}</span>
            {game.scene.subs.map((emoji, i) => (
              <span key={i} className={`thumb-sub thumb-sub-${i + 1}`} aria-hidden="true">
                {emoji}
              </span>
            ))}
            <span className="thumb-robot" aria-hidden="true">🤖</span>
          </div>
          <h3 className="card-name">{game.name}</h3>
          <p className="card-desc">{game.description}</p>
        </button>
        <div className="card-tags">
          {game.abilities.map((key) => (
            <span key={key} className="tag">
              <span aria-hidden="true">{ABILITIES[key].icon}</span> {ABILITIES[key].label}
            </span>
          ))}
        </div>
        <button type="button" className="cta-btn" onClick={() => onSelect(game)}>
          커리큘럼 이동
        </button>
      </div>
      <button
        type="button"
        className={`star-btn${isFavorite ? ' is-on' : ''}`}
        aria-label={isFavorite ? `${game.name} 즐겨찾기 해제` : `${game.name} 즐겨찾기 추가`}
        aria-pressed={isFavorite}
        onClick={() => onToggleFavorite(game.id)}
      >
        ★
      </button>
    </article>
  )
}
