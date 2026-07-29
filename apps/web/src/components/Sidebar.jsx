export default function Sidebar({ days, dayIndex, open, onNavigate, onClose }) {
  return (
    <nav className={`sidebar${open ? ' is-open' : ''}`}>
      <button type="button" className="sidebar-close" aria-label="메뉴 닫기" onClick={onClose}>
        ✕
      </button>
      <div className="logo">
        <div className="logo-chips">
          <span className="logo-chip logo-chip-red">AI 키성장 +</span>
          <span className="logo-chip logo-chip-blue">바른자세 교실</span>
        </div>
        <div className="logo-name">
          히어로
          <br />
          챌린지
        </div>
        <div className="logo-mascot" aria-hidden="true">🦸</div>
      </div>
      <ul className="menu">
        {days.map((day, i) => (
          <li key={day.id}>
            <button
              type="button"
              className={`menu-item${dayIndex === i ? ' is-active' : ''}`}
              onClick={() => onNavigate(i)}
            >
              <span className="menu-icon" aria-hidden="true">{day.icon}</span>
              <span>{day.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
