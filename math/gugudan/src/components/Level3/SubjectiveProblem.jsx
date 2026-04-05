import { useState, useRef, useEffect } from 'react'
import { playCorrect, playWrong } from '../../utils/sound'

export default function SubjectiveProblem({ questions, onFinish }) {
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
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
      setScore(s => s + 1)
      playCorrect()
    } else {
      setFeedback('wrong')
      playWrong()
    }

    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        onFinish(score + (num === q.answer ? 1 : 0))
        return
      }
      setIdx(i => i + 1)
      setValue('')
      setFeedback(null)
    }, 900)
  }

  const aStr = String(q.a)
  const bStr = String(q.b)
  const maxLen = Math.max(aStr.length, bStr.length) + 1

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#888', fontSize: 17 }}>문제 {idx + 1} / {questions.length}</span>
        <span className="score-text">✅ {score}</span>
      </div>
      <div className="progress-bar-bg" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <p style={{ color: '#888', fontSize: 18, marginBottom: 12 }}>답을 직접 써봐요!</p>

      {/* Vertical multiply layout */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div className="vertical-multiply">
          <div style={{ textAlign: 'right' }}>{q.a}</div>
          <div style={{ textAlign: 'right' }}>× {q.b}</div>
          <div className="line" style={{ textAlign: 'right', color: '#1565c0' }}>?</div>
        </div>
      </div>

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
          style={{ width: 200 }}
          autoFocus
        />
        <div className={`feedback ${feedback || ''}`}>
          {feedback === 'correct' ? '🎉 정답이에요!' : feedback === 'wrong' ? `❌ 정답은 ${q.answer}이에요` : ''}
        </div>
        <button
          type="submit"
          className="btn btn-blue"
          disabled={!value || feedback !== null}
          style={{ width: '100%' }}
        >
          확인
        </button>
      </form>
    </div>
  )
}
