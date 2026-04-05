import { useState, useEffect, useRef } from 'react'
import { generateWrongAnswers, shuffle } from '../../utils/math'
import { playCorrect, playWrong } from '../../utils/sound'

function makeQuestion(dan, k) {
  const answer = dan * k
  const wrongs = generateWrongAnswers(answer, 3)
  const choices = shuffle([answer, ...wrongs])
  return { dan, k, answer, choices }
}

export default function MultipleChoice({ dan, onNext }) {
  const [questions] = useState(() =>
    Array.from({ length: 9 }, (_, i) => makeQuestion(dan, i + 1))
  )
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [shakeKey, setShakeKey] = useState(0)

  // reset when dan changes
  useEffect(() => {
    setIdx(0)
    setSelected(null)
    setCorrect(0)
  }, [dan])

  const q = questions[idx]

  function handleSelect(choice) {
    if (selected !== null) return
    setSelected(choice)
    if (choice === q.answer) {
      playCorrect()
      setCorrect(c => c + 1)
    } else {
      playWrong()
      setShakeKey(k => k + 1)
    }
    setTimeout(() => {
      if (idx + 1 < questions.length) {
        setIdx(i => i + 1)
        setSelected(null)
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
      <div
        className="progress-bar-bg"
        style={{ marginBottom: 16 }}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${((idx) / questions.length) * 100}%` }}
        />
      </div>

      <p style={{ fontSize: 20, color: '#888', marginBottom: 4 }}>정답을 골라봐요!</p>
      <div
        key={shakeKey}
        className={shakeKey > 0 ? 'shake' : ''}
        style={{ display: 'inline-block' }}
      >
        <div className="question-text">
          {q.dan} × {q.k} = ?
        </div>
      </div>

      <div className="choices">
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
