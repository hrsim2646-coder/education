import { useState } from 'react'
import MCProblem from './MCProblem'
import SubjectiveProblem from './SubjectiveProblem'
import { generateLevel3Question, generateWrongAnswers, generateWrongAnswersLarge, shuffle } from '../../utils/math'

const STAGE_INFO = [
  { n: 1, label: '1단계', desc: '한 자리 × 한 자리', example: '7 × 8', color: '#6BCB77' },
  { n: 2, label: '2단계', desc: '두 자리 × 한 자리', example: '45 × 6', color: '#4D96FF' },
  { n: 3, label: '3단계', desc: '두~세 자리 × 두 자리', example: '234 × 45', color: '#FF6B9D' },
]

const SUB_COUNT = 5  // 세로 풀이형 (주관식)
const MC_COUNT  = 3  // 가로 풀이형 (객관식)

function generateSubQuestions(stage) {
  return Array.from({ length: SUB_COUNT }, () => generateLevel3Question(stage))
}

function generateMCQuestions(stage) {
  return Array.from({ length: MC_COUNT }, () => {
    const q = generateLevel3Question(stage)
    const wrongs = q.answer > 81
      ? generateWrongAnswersLarge(q.answer, 3)
      : generateWrongAnswers(q.answer, 3)
    return { ...q, choices: shuffle([q.answer, ...wrongs]) }
  })
}

export default function Level3({ onBack }) {
  const [stage, setStage] = useState(null)
  const [phase, setPhase] = useState('subjective') // subjective → mc → result
  const [questions, setQuestions] = useState(null)
  const [subScore, setSubScore] = useState(0)
  const [mcScore, setMcScore] = useState(0)

  function startStage(n) {
    setStage(n)
    setQuestions(generateSubQuestions(n)) // start with 세로 (주관식)
    setPhase('subjective')
    setSubScore(0)
    setMcScore(0)
  }

  function handleSubFinish(score) {
    setSubScore(score)
    setQuestions(generateMCQuestions(stage)) // 가로 (객관식) questions
    setPhase('mc')
  }

  function handleMcFinish(score) {
    setMcScore(score)
    setPhase('result')
  }

  function restart() {
    setStage(null)
    setPhase('subjective')
    setSubScore(0)
    setMcScore(0)
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
                <p style={{ marginTop: 2, fontSize: 14, color: '#aaa' }}>
                  세로 {SUB_COUNT}문제 → 가로 {MC_COUNT}문제
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  const info = STAGE_INFO[stage - 1]

  if (phase === 'result') {
    const total = subScore + mcScore
    const maxTotal = SUB_COUNT + MC_COUNT
    const emoji = total >= maxTotal - 1 ? '🏆' : total >= maxTotal - 3 ? '🥈' : total >= Math.floor(maxTotal / 2) ? '🥉' : '💪'
    return (
      <div className="page">
        <div className="result-screen" style={{ width: '100%' }}>
          <div className="result-big">{emoji}</div>
          <h1>완료!</h1>
          <div className="card" style={{ width: '100%' }}>
            <p style={{ fontSize: 18, color: '#888', marginBottom: 8 }}>
              {info.label} ({info.desc}) 결과
            </p>
            <div style={{ fontSize: 22, margin: '8px 0' }}>📐 세로 풀이: <strong>{subScore} / {SUB_COUNT}</strong></div>
            <div style={{ fontSize: 22, margin: '8px 0' }}>🔵 가로 객관식: <strong>{mcScore} / {MC_COUNT}</strong></div>
            <div className="result-score" style={{ marginTop: 12 }}>
              총점: {total} / {maxTotal}
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
          {info.label} — {phase === 'subjective' ? '📐 세로 풀이' : '🔵 가로 객관식'}
        </span>
      </div>

      {/* Phase dots */}
      <div className="phase-indicator">
        <div className={`phase-dot ${phase === 'subjective' ? 'active' : 'done'}`} />
        <div className={`phase-dot ${phase === 'mc' ? 'active' : ''}`} />
      </div>

      {phase === 'subjective' && questions && (
        <SubjectiveProblem questions={questions} onFinish={handleSubFinish} />
      )}
      {phase === 'mc' && questions && (
        <MCProblem questions={questions} onFinish={handleMcFinish} />
      )}
    </div>
  )
}
