export default function LevelSelect({ onSelect }) {
  const levels = [
    {
      n: 1,
      emoji: '📚',
      title: '레벨 1 — 구구단 암기',
      desc: '2단부터 9단까지 차근차근 외워봐요!\n표 보기 → 객관식 → 직접 쓰기 → 누적 테스트',
      color: '#FFD93D',
      border: '#FFC200',
    },
    {
      n: 2,
      emoji: '🎮',
      title: '레벨 2 — 구구단 게임',
      desc: '친구가 문제를 내면 맞춰봐요!\n객관식 게임 → 제한시간 주관식 게임',
      color: '#6BCB77',
      border: '#3DAA4E',
    },
    {
      n: 3,
      emoji: '🧮',
      title: '레벨 3 — 곱셈 풀기',
      desc: '더 큰 숫자 곱셈에 도전해봐요!\n1단계: 한 자리 / 2단계: 두 자리 / 3단계: 세 자리',
      color: '#4D96FF',
      border: '#1565c0',
    },
  ]

  return (
    <div className="page" style={{ paddingTop: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>🌟</div>
        <h1 style={{ fontSize: 40, marginTop: 8 }}>구구단 학습</h1>
        <p style={{ color: '#888', fontSize: 18, marginTop: 4 }}>레벨을 골라봐요!</p>
      </div>

      {levels.map(lv => (
        <button
          key={lv.n}
          className="level-card"
          style={{ borderColor: lv.border, cursor: 'pointer', background: '#fff' }}
          onClick={() => onSelect(lv.n)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                fontSize: 40,
                background: lv.color,
                borderRadius: 16,
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {lv.emoji}
            </div>
            <div>
              <h2 style={{ fontSize: 24 }}>{lv.title}</h2>
              <p style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{lv.desc}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
