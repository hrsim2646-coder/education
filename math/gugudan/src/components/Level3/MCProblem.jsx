import { useState } from 'react'
import { generateWrongAnswersLarge, generateWrongAnswers, shuffle } from '../../utils/math'
import { playCorrect, playWrong } from '../../utils/sound'

const TOTAL = 10

function makeChoices(answer, isLarge) {
  const wrongs = isLarge ? generateWrongAnswersLarge(answer, 3) : generateWrongAnswers(answer, 3)
  return shuffle([answer, ...wrongs])
}

export default function MCProblem({ questions, onFinish }) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [shakeKey, setShakeKey] = useState(0)

  const q = questions[idx]
  const isLarge = q.answer > 81 // larger than 9×9
  const choices = q.choices // pre-generated

  function handleSelect(c) {
    if (selected !== null) return
    setSelected(c)
    if (c === q.answer) {
      playCorrect()
      setScore(s => s + 1)
    } else {
      playWrong()
      setShakeKey(k => k + 1)
    }
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        onFinish(score + (c === q.answer ? 1 : 0))
        return
      }
      setIdx(i => i + 1)
      setSelected(null)
    }, 900)
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#888', fontSize: 17 }}>문제 {idx + 1} / {questions.length}</span>
        <span className="score-text">✅ {score}</span>
      </div>
      <div className="progress-bar-bg" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <p style={{ color: '#888', fontSize: 18, marginBottom: 4 }}>정답을 골라봐요!</p>
      <div key={shakeKey} className={shakeKey > 0 ? 'shake' : ''} style={{ display: 'inline-block' }}>
        <div className="question-text">{q.a} × {q.b} = ?</div>
      </div>

      <div className="choices" style={{ gridTemplateColumns: q.answer > 999 ? '1fr 1fr' : '1fr 1fr' }}>
        {q.choices.map(c => {
          let cls = 'choice-btn'
          if (selected !== null) {
            if (c === q.answer) cls += ' correct'
            else if (c === selected) cls += ' wrong'
          }
          return (
            <button
              key={c}
              className={cls}
              style={{ fontSize: q.answer > 9999 ? 22 : 28 }}
              onClick={() => handleSelect(c)}
              disabled={selected !== null}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}
