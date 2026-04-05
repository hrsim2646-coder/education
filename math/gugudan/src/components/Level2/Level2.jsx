import { useState } from 'react'
import MCGame from './MCGame'
import TimedGame from './TimedGame'

const STAGE_INFO = [
  { n: 1, label: '1단계', time: '20초', color: '#6BCB77', desc: '여유롭게 풀어봐요!' },
  { n: 2, label: '2단계', time: '10초', color: '#4D96FF', desc: '조금 빠르게!' },
  { n: 3, label: '3단계', time: '5초', color: '#FF6B9D', desc: '번개처럼 빠르게! ⚡' },
]

export default function Level2({ onBack }) {
  const [stage, setStage] = useState(null)   // 1|2|3
  const [phase, setPhase] = useState('mc')  // mc | timed | result
  const [mcScore, setMcScore] = useState(0)
  const [timedScore, setTimedScore] = useState(0)

  function handleMcFinish(score) {
    setMcScore(score)
    setPhase('timed')
  }

  function handleTimedFinish(score) {
    setTimedScore(score)
    setPhase('result')
  }

  function restart() {
    setStage(null)
    setPhase('mc')
    setMcScore(0)
    setTimedScore(0)
  }

  // Stage selection
  if (stage === null) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="back-btn" onClick={onBack}>← 뒤로</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 48 }}>🎮</div>
          <h1 style={{ fontSize: 34 }}>레벨 2 — 구구단 게임</h1>
          <p style={{ color: '#888', fontSize: 17 }}>난이도를 골라봐요!</p>
        </div>

        {STAGE_INFO.map(s => (
          <button
            key={s.n}
            className="level-card"
            style={{ borderColor: s.color, cursor: 'pointer' }}
            onClick={() => setStage(s.n)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                background: s.color, borderRadius: 14, width: 56, height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 900, color: '#fff', flexShrink: 0,
              }}>
                {s.n}
              </div>
              <div>
                <h2 style={{ fontSize: 22 }}>{s.label} — 제한시간 {s.time}</h2>
                <p style={{ marginTop: 4 }}>{s.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  const info = STAGE_INFO[stage - 1]

  if (phase === 'result') {
    const total = mcScore + timedScore
    const maxTotal = 15
    const emoji = total >= 13 ? '🏆' : total >= 10 ? '🥈' : total >= 7 ? '🥉' : '💪'
    return (
      <div className="page">
        <div className="result-screen" style={{ width: '100%' }}>
          <div className="result-big">{emoji}</div>
          <h1>게임 완료!</h1>
          <div className="card" style={{ width: '100%' }}>
            <p style={{ fontSize: 18, color: '#888', marginBottom: 8 }}>{info.label} 결과</p>
            <div style={{ fontSize: 22, margin: '8px 0' }}>🔵 객관식: <strong>{mcScore} / 5</strong></div>
            <div style={{ fontSize: 22, margin: '8px 0' }}>⏱ 주관식: <strong>{timedScore} / 10</strong></div>
            <div className="result-score" style={{ marginTop: 12 }}>
              총점: {total} / {maxTotal}
            </div>
          </div>
          <div className="gap-row">
            <button className="btn btn-green" onClick={restart}>다시 하기</button>
            <button className="btn btn-gray" onClick={onBack}>처음으로</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <button className="back-btn" onClick={restart}>← 난이도</button>
        <span style={{ fontWeight: 700, color: '#555', fontSize: 17 }}>
          {info.label} — {phase === 'mc' ? '🔵 객관식' : '⏱ 주관식'}
        </span>
      </div>

      {phase === 'mc' && <MCGame stage={stage} onFinish={handleMcFinish} />}
      {phase === 'timed' && <TimedGame stage={stage} onFinish={handleTimedFinish} />}
    </div>
  )
}
