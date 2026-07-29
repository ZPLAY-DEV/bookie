const SUPPORT = [
  {
    icon: '📞',
    body: (
      <>
        <strong className="support-phone">1544-0000</strong>
        <span>늘봄교육 고객센터</span>
      </>
    ),
  },
  {
    icon: '💻',
    body: (
      <div className="support-links">
        <span>🔒 로그인오류</span>
        <span className="support-divider">|</span>
        <span>▶️ 동영상오류</span>
      </div>
    ),
  },
  {
    icon: '🖥️',
    body: (
      <>
        <strong>PC 원격지원 서비스</strong>
        <span>
          실시간으로 고객님의 컴퓨터를
          <br />
          제어하면서 문제를 해결해 드립니다.
        </span>
      </>
    ),
  },
  {
    icon: '🤝',
    body: (
      <>
        <strong>서비스 및 콘텐츠 제휴 문의</strong>
        <span>
          다양한 협력사의 제안을
          <br />
          기다리고 있습니다.
        </span>
      </>
    ),
  },
]

const LINKS = ['늘봄교육 소개', '회사소개', '이용약관', '개인정보 처리방침', '광고 및 제휴문의', '📷 Instagram', 'facebook', 'kakao talk']

const CENTERS = [
  ['늘봄교육', '1544-0000'],
  ['원격교육연수원', '1544-0001'],
  ['늘봄교육몰', '1544-0002'],
  ['하이클래스', '1811-0003'],
]

const BADGES = [
  ['🎖️', '플립러닝 공식 인증\n미션 파트너'],
  ['🏅', 'I.M.S Learning Impact\n국제이러닝 표준화기구 대상 2010'],
  ['🏆', 'IT 혁신대상\n지식경제부 2009'],
  ['✅', '[굿콘텐츠서비스인증]\n우수 콘텐츠 서비스 인증 획득'],
  ['📜', '전자출판물\n인증서 2026'],
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-support">
        {SUPPORT.map((item, i) => (
          <div key={i} className="support-cell">
            <span className="support-icon" aria-hidden="true">{item.icon}</span>
            {item.body}
          </div>
        ))}
      </div>
      <div className="footer-links">
        {LINKS.map((link) => (
          <a
            key={link}
            href="#"
            onClick={(e) => e.preventDefault()}
            className={link === '개인정보 처리방침' ? 'is-privacy' : undefined}
          >
            {link}
          </a>
        ))}
      </div>
      <div className="footer-info">
        <div className="footer-company">
          <div className="footer-brand">
            <span aria-hidden="true">🦸</span> 늘봄교육
          </div>
          <p>주소 : 서울특별시 히어로구 챌린지로 123, 늘봄타워 4층</p>
          <p>대표이사 : 김영희</p>
          <p>사업자등록번호 : 123-45-67890</p>
          <p>통신판매업신고번호 : 2026-서울히어로-0001</p>
          <p>대표전화 : 1544-0000</p>
          <p>팩스 : (02)123-4567</p>
          <p>E-mail : hello@neulbom.edu</p>
        </div>
        <div className="footer-center">
          <h3>Customer center</h3>
          <dl>
            {CENTERS.map(([name, phone]) => (
              <div key={name} className="center-row">
                <dt>{name}</dt>
                <dd>{phone}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="footer-copy">© Neulbom Education Corporation. All rights reserved.</p>
      <div className="footer-badges">
        {BADGES.map(([icon, text]) => (
          <div key={text} className="badge-cell">
            <span className="badge-icon" aria-hidden="true">{icon}</span>
            <span className="badge-text">{text}</span>
          </div>
        ))}
      </div>
    </footer>
  )
}
