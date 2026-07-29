import { useEffect } from 'react'
import { ABILITIES } from '../data/games.js'

export default function GameModal({ game, isFavorite, onToggleFavorite, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={game.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>
          ✕
        </button>
        <div className="modal-thumb" style={{ background: game.scene.bg }}>
          <span className="thumb-main" aria-hidden="true">{game.scene.main}</span>
          <span className="thumb-robot" aria-hidden="true">🤖</span>
        </div>
        <h2 className="modal-name">{game.name}</h2>
        <div className="card-tags">
          {game.abilities.map((key) => (
            <span key={key} className="tag">
              <span aria-hidden="true">{ABILITIES[key].icon}</span> {ABILITIES[key].label}
            </span>
          ))}
        </div>
        <p className="modal-desc">{game.description}</p>
        <div className="modal-actions">
          <button
            type="button"
            className={`star-btn modal-star${isFavorite ? ' is-on' : ''}`}
            aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            aria-pressed={isFavorite}
            onClick={() => onToggleFavorite(game.id)}
          >
            ★
          </button>
          <button type="button" className="start-btn" onClick={onClose}>
            시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
