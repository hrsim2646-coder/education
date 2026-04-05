import { useState, useEffect } from 'react'
import { generateWrongAnswers, shuffle } from '../../utils/math'
import { playCorrect, playWrong } from '../../utils/sound'
import CharacterSVG from './CharacterSVG'

const TOTAL = 10

function makeQuestion() {
  const dan = Math.floor(Math.random() * 8) + 2 // 2~9
  const k = Math.floor(Math.random() * 9) + 1
  const answer = dan * k
  const wrongs = generateWrongAnswers(answer, 3)
  const choices = shuffle([answer, ...wrongs])
  return { dan, k, answer, choices }
}

export default function MCGame({ onFinish }) {
  const [questions] = useState(() => Array.from({ length: TOTAL }, makeQuestion))
  const [idx, setIdx] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [mood, setMood] = useState('normal')
  const [shakeKey, setShakeKey] = useState(0)

  const q = questions[idx]

  function handleSelect(choice) {
    if (selected !== null || revealed) return
    setSelected(choice)

    if (choice === q.answer) {
      setMood('happy')
      setScore(s => s + 1)
      playCorrect()
      setTimeout(nextQuestion, 1000)
    } else {
      setMood('sad')
      playWrong()
      setShakeKey(k => k + 1)
      const newWrong = wrongCount + 1
      setWrongCount(newWrong)
      if (newWrong >= 2) {
        setRevealed(true)
        setTimeout(nextQuestion, 1400)
      } else {
        setTimeout(() => {
          setSelected(null)
          setMood('normal')
        }, 700)
      }
    }
  }

  function nextQuestion() {
    if (idx + 1 >= questions.length) {
      onFinish(score + (selected === q.answer ? 1 : 0))
      return
    }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
    setWrongCount(0)
    setMood('normal')
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#888', fontSize: 17 }}>문제 {idx + 1} / {TOTAL}</span>
        <span className="score-text">✅ {score}</span>
      </div>
      <div className="progress-bar-bg" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: `${(idx / TOTAL) * 100}%` }} />
      </div>

      {/* Character + bubble */}
      <div className="character-area" style={{ marginBottom: 16 }}>
        <CharacterSVG mood={mood} />
        <div style={{ position: 'relative', flex: 1 }}>
          <div className="speech-bubble">
            <div
              key={shakeKey}
              className={shakeKey > 0 ? 'shake' : ''}
              style={{ display: 'inline-block' }}
            >
              {q.dan} × {q.k} = ?
            </div>
          </div>
          {wrongCount === 1 && !revealed && (
            <div style={{ marginTop: 8, color: '#e03030', fontWeight: 700, fontSize: 17 }}>
              ⚠️ 한 번 더 기회가 있어요!
            </div>
          )}
          {revealed && (
            <div style={{ marginTop: 8, color: '#e03030', fontWeight: 700, fontSize: 17 }}>
              💡 정답은 <strong>{q.answer}</strong>이에요!
            </div>
          )}
        </div>
      </div>

      <div className="choices">
        {q.choices.map(c => {
          let cls = 'choice-btn'
          if (revealed && c === q.answer) cls += ' correct'
          else if (selected !== null && c === q.answer && selected === c) cls += ' correct'
          else if (selected === c && c !== q.answer) cls += ' wrong'
          return (
            <button
              key={c}
              className={cls}
              onClick={() => handleSelect(c)}
              disabled={selected !== null && selected !== c && !revealed}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}
