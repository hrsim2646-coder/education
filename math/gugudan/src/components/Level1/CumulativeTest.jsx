import { useState, useRef, useEffect } from 'react'
import { weightedRandomDan, shuffle } from '../../utils/math'
import { playCorrect, playWrong } from '../../utils/sound'

const TOTAL = 10

function makeQuestion(maxDan) {
  const dan = weightedRandomDan(maxDan)
  const k = Math.floor(Math.random() * 9) + 1
  return { dan, k, answer: dan * k }
}

export default function CumulativeTest({ maxDan, onNext }) {
  const [questions] = useState(() =>
    Array.from({ length: TOTAL }, () => makeQuestion(maxDan))
  )
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [correct, setCorrect] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [idx])

  const q = questions[idx]

  function handleSubmit(e) {
    e.preventDefault()
    if (feedback !== null) return
    const num = parseInt(value, 10)
    if (isNaN(num)) return

    if (num === q.answer) {
      setFeedback('correct')
      setCorrect(c => c + 1)
      playCorrect()
    } else {
      setFeedback('wrong')
      playWrong()
    }
    setTimeout(() => {
      if (idx + 1 < questions.length) {
        setIdx(i => i + 1)
        setValue('')
        setFeedback(null)
      } else {
        onNext()
      }
    }, 900)
  }

  if (idx >= questions.length) return null

  return (
    <div className="card" style={{ borderTop: '6px solid #C77DFF' }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ background: '#C77DFF', color: '#fff', borderRadius: 10, padding: '4px 14px', fontWeight: 700 }}>
          📝 누적 테스트 (2~{maxDan}단)
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 8px' }}>
        <span style={{ color: '#888', fontSize: 17 }}>문제 {idx + 1} / {TOTAL}</span>
        <span className="score-text">✅ {correct}</span>
      </div>
      <div className="progress-bar-bg" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: `${(idx / TOTAL) * 100}%` }} />
      </div>

      <div className="question-text">{q.dan} × {q.k} = ?</div>
      <p style={{ color: '#999', fontSize: 15, marginTop: -8, marginBottom: 12 }}>({q.dan}단)</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <input
          ref={inputRef}
          className={`answer-input ${feedback === 'correct' ? 'correct' : feedback === 'wrong' ? 'wrong' : ''}`}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={feedback !== null}
          placeholder="?"
          autoFocus
        />
        <div className={`feedback ${feedback || ''}`}>
          {feedback === 'correct' ? '🎉 정답!' : feedback === 'wrong' ? `❌ 정답: ${q.answer}` : ''}
        </div>
        <button
          type="submit"
          className="btn btn-purple"
          disabled={!value || feedback !== null}
          style={{ width: '100%' }}
        >
          확인
        </button>
      </form>
    </div>
  )
}
