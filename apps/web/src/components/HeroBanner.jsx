import { ABILITIES } from '../data/games.js'

export default function HeroBanner({ game, onSelect }) {
  return (
    <section className="hero" style={{ background: game.scene.bg }}>
      <div className="hero-text">
        <span className="hero-eyebrow">오늘의 추천 게임</span>
        <h2 className="hero-title">{game.name}</h2>
        <p className="hero-desc">{game.description}</p>
        <div className="hero-bottom">
          <button type="button" className="start-btn" onClick={() => onSelect(game)}>
            지금 시작하기
          </button>
          <div className="card-tags">
            {game.abilities.map((key) => (
              <span key={key} className="tag">
                <span aria-hidden="true">{ABILITIES[key].icon}</span> {ABILITIES[key].label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="hero-main">{game.scene.main}</span>
        <span className="hero-robot">🤖</span>
        {game.scene.subs.map((emoji, i) => (
          <span key={i} className={`hero-sub hero-sub-${i + 1}`}>
            {emoji}
          </span>
        ))}
      </div>
    </section>
  )
}
