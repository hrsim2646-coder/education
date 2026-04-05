import { useState } from 'react'
import MCProblem from './MCProblem'
import SubjectiveProblem from './SubjectiveProblem'
import { generateLevel3Question, generateWrongAnswers, generateWrongAnswersLarge, shuffle } from '../../utils/math'

const STAGE_INFO = [
  { n: 1, label: '1단계', desc: '한 자리 × 한 자리', example: '7 × 8', color: '#6BCB77' },
  { n: 2, label: '2단계', desc: '두 자리 × 한 자리', example: '45 × 6', color: '#4D96FF' },
  { n: 3, label: '3단계', desc: '두~세 자리 × 두 자리', example: '234 × 45', color: '#FF6B9D' },
]

function generateQuestions(stage) {
  return Array.from({ length: 10 }, () => {
    const q = generateLevel3Question(stage)
    const wrongs = q.answer > 81
      ? generateWrongAnswersLarge(q.answer, 3)
      : generateWrongAnswers(q.answer, 3)
    return { ...q, choices: shuffle([q.answer, ...wrongs]) }
  })
}

export default function Level3({ onBack }) {
  const [stage, setStage] = useState(null)
  const [phase, setPhase] = useState('mc')  // mc | subjective | result
  const [questions, setQuestions] = useState(null)
  const [mcScore, setMcScore] = useState(0)
  const [subScore, setSubScore] = useState(0)

  function startStage(n) {
    setStage(n)
    setQuestions(generateQuestions(n))
    setPhase('mc')
    setMcScore(0)
    setSubScore(0)
  }

  function handleMcFinish(score) {
    setMcScore(score)
    setQuestions(generateQuestions(stage)) // fresh questions for subjective
    setPhase('subjective')
  }

  function handleSubFinish(score) {
    setSubScore(score)
    setPhase('result')
  }

  function restart() {
    setStage(null)
    setPhase('mc')
    setMcScore(0)
    setSubScore(0)
    setQuestions(null)
  }

  // Stage selection
  if (stage === null) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="back-btn" onClick={onBack}>← 뒤로</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 48 }}>🧮</div>
          <h1 style={{ fontSize: 34 }}>레벨 3 — 곱셈 풀기</h1>
          <p style={{ color: '#888', fontSize: 17 }}>단계를 골라봐요!</p>
        </div>

        {STAGE_INFO.map(s => (
          <button
            key={s.n}
            className="level-card"
            style={{ borderColor: s.color, cursor: 'pointer' }}
            onClick={() => startStage(s.n)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                background: s.color, borderRadius: 14, width: 56, height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0,
              }}>
                {s.n}
              </div>
              <div>
                <h2 style={{ fontSize: 22 }}>{s.label} — {s.desc}</h2>
                <p style={{ marginTop: 4, fontSize: 16 }}>예) {s.example} = ?</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  const info = STAGE_INFO[stage - 1]

  if (phase === 'result') {
    const total = mcScore + subScore
    const emoji = total >= 18 ? '🏆' : total >= 14 ? '🥈' : total >= 10 ? '🥉' : '💪'
    return (
      <div className="page">
        <div className="result-screen" style={{ width: '100%' }}>
          <div className="result-big">{emoji}</div>
          <h1>완료!</h1>
          <div className="card" style={{ width: '100%' }}>
            <p style={{ fontSize: 18, color: '#888', marginBottom: 8 }}>
              {info.label} ({info.desc}) 결과
            </p>
            <div style={{ fontSize: 22, margin: '8px 0' }}>🔵 객관식: <strong>{mcScore} / 10</strong></div>
            <div style={{ fontSize: 22, margin: '8px 0' }}>✏️ 주관식: <strong>{subScore} / 10</strong></div>
            <div className="result-score" style={{ marginTop: 12 }}>
              총점: {total} / 20
            </div>
          </div>
          <div className="gap-row">
            <button className="btn btn-blue" onClick={restart}>다시 하기</button>
            <button className="btn btn-gray" onClick={onBack}>처음으로</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <button className="back-btn" onClick={restart}>← 단계 선택</button>
        <span style={{ fontWeight: 700, color: '#555', fontSize: 17 }}>
          {info.label} — {phase === 'mc' ? '🔵 객관식' : '✏️ 주관식'}
        </span>
      </div>

      {/* Phase dots */}
      <div className="phase-indicator">
        <div className={`phase-dot ${phase === 'mc' ? 'active' : 'done'}`} />
        <div className={`phase-dot ${phase === 'subjective' ? 'active' : phase === 'result' ? 'done' : ''}`} />
      </div>

      {phase === 'mc' && questions && (
        <MCProblem questions={questions} onFinish={handleMcFinish} />
      )}
      {phase === 'subjective' && questions && (
        <SubjectiveProblem questions={questions} onFinish={handleSubFinish} />
      )}
    </div>
  )
}
