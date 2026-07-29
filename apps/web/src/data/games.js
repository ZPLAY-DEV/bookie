export const ABILITIES = {
  reflex: { label: '순발력', icon: '⚡' },
  focus: { label: '집중력', icon: '🎯' },
  memory: { label: '기억력', icon: '🧠' },
  cardio: { label: '유산소', icon: '💗' },
  teamwork: { label: '협동력', icon: '🤝' },
}

export const GAMES = [
  {
    id: 'freeze',
    name: '멈춰! 얼음땡',
    abilities: ['reflex', 'focus'],
    scene: { bg: 'linear-gradient(160deg, #7fd8ff 0%, #3f8ef7 55%, #2a4fd0 100%)', main: '🧊', subs: ['🐧', '❄️', '✨'] },
    description: '음악이 멈추면 그대로 얼음! 화면 속 히어로를 따라 움직이다가 신호에 맞춰 멈추는 순발력 게임이에요.',
  },
  {
    id: 'memory-card',
    name: '기억력 카드',
    abilities: ['memory', 'focus'],
    scene: { bg: 'linear-gradient(160deg, #ffe29a 0%, #8fd06b 55%, #3f9b62 100%)', main: '🎴', subs: ['🏆', '🃏', '⭐'] },
    description: '뒤집힌 카드의 위치를 기억하고 짝을 맞춰요. 단계가 올라갈수록 카드가 많아져요!',
  },
  {
    id: 'bomb',
    name: '폭탄 피하기',
    abilities: ['cardio', 'teamwork'],
    scene: { bg: 'linear-gradient(160deg, #ffb36b 0%, #f75d3f 55%, #8f1d1d 100%)', main: '💣', subs: ['💥', '🔥', '💨'] },
    description: '하늘에서 떨어지는 폭탄을 요리조리 피해요. 친구와 함께하면 더 신나는 유산소 게임!',
  },
  {
    id: 'mole',
    name: '두더지를 잡아라',
    abilities: ['cardio', 'focus'],
    scene: { bg: 'linear-gradient(160deg, #ffd98a 0%, #e8935a 55%, #a04f2a 100%)', main: '🔨', subs: ['🐹', '🌵', '💫'] },
    description: '불쑥불쑥 올라오는 두더지를 뿅망치로 잡아요. 집중력과 스피드가 승부를 갈라요!',
  },
  {
    id: 'flag',
    name: '청기 백기',
    abilities: ['reflex', 'focus'],
    scene: { bg: 'linear-gradient(160deg, #ffe9c9 0%, #f7b46b 55%, #b06a3a 100%)', main: '🚩', subs: ['🏳️', '🐰', '🐻'] },
    description: '"청기 올려! 백기 내리지 마!" 헷갈리는 명령을 듣고 정확하게 깃발을 움직여요.',
  },
  {
    id: 'virus',
    name: '바이러스 잡기',
    abilities: ['cardio', 'focus'],
    scene: { bg: 'linear-gradient(160deg, #a86bf7 0%, #5b2fd0 55%, #2a1060 100%)', main: '🦠', subs: ['🛡️', '⚔️', '✨'] },
    description: '몰려오는 바이러스를 히어로 방패로 물리쳐요. 몸을 움직여 우리 몸을 지켜요!',
  },
  {
    id: 'food-catcher',
    name: '푸드캐처',
    abilities: ['cardio', 'focus'],
    scene: { bg: 'linear-gradient(160deg, #b8f77f 0%, #58c95b 55%, #1f7a3d 100%)', main: '🍎', subs: ['🍌', '🍇', '🧺'] },
    description: '떨어지는 몸에 좋은 음식만 바구니에 쏙! 정크푸드는 피하고 건강 점수를 모아요.',
  },
  {
    id: 'jump-rope',
    name: '단체 줄넘기',
    abilities: ['cardio', 'teamwork'],
    scene: { bg: 'linear-gradient(160deg, #ffd6a1 0%, #f79a5f 55%, #c05a3a 100%)', main: '🐰', subs: ['🐻', '🐶', '🎏'] },
    description: '친구들과 호흡을 맞춰 다 같이 점프! 오래 넘을수록 협동력 점수가 올라가요.',
  },
]
