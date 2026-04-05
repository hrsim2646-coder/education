import { useState, useEffect, useRef } from 'react'
import { playCorrect, playWrong } from '../../utils/sound'
import { shuffle } from '../../utils/math'

export default function FillIn({ dan, onNext }) {
  const [questions] = useState(() =>
    shuffle(Array.from({ length: 9 }, (_, i) => ({ k: i + 1, answer: dan * (i + 1) })))
  )
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [correct, setCorrect] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    setIdx(0)
    setValue('')
    setFeedback(null)
    setCorrect(0)
  }, [dan])

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

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#888', fontSize: 17 }}>문제 {idx + 1} / {questions.length}</span>
        <span className="score-text">✅ {correct}</span>
      </div>
      <div className="progress-bar-bg" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <p style={{ fontSize: 20, color: '#888', marginBottom: 4 }}>답을 직접 써봐요!</p>
      <div className="question-text">{dan} × {q.k} = ?</div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 12 }}>
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
