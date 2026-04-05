import { useState, useEffect, useRef } from 'react'
import { generateWrongAnswers, shuffle } from '../../utils/math'
import { playCorrect, playWrong, playTimeout } from '../../utils/sound'
import CharacterSVG from './CharacterSVG'

const TOTAL = 5
const MC_TIME_LIMITS = { 1: 20, 2: 10, 3: 5 }

function makeQuestion() {
  const dan = Math.floor(Math.random() * 8) + 2 // 2~9
  const k = Math.floor(Math.random() * 9) + 1
  const answer = dan * k
  const wrongs = generateWrongAnswers(answer, 3)
  const choices = shuffle([answer, ...wrongs])
  return { dan, k, answer, choices }
}

export default function MCGame({ stage, onFinish }) {
  const timeLimit = MC_TIME_LIMITS[stage] ?? 15
  const [question, setQuestion] = useState(makeQuestion)
  const [questionNum, setQuestionNum] = useState(1)
  const [wrongCount, setWrongCount] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [mood, setMood] = useState('normal')
  const [shakeKey, setShakeKey] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const timerRef = useRef(null)
  const lockedRef = useRef(false) // prevent multiple transitions
  const scoreRef = useRef(0)

  // Start / reset timer on each new question
  useEffect(() => {
    lockedRef.current = false
    setTimeLeft(timeLimit)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const next = parseFloat((t - 0.1).toFixed(1))
        if (next <= 0) {
          clearInterval(timerRef.current)
          setTimeout(() => {
            if (!lockedRef.current) handleTimeout()
          }, 0)
          return 0
        }
        return next
      })
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [question]) // reset timer on each fresh question

  function handleTimeout() {
    if (lockedRef.current) return
    lockedRef.current = true
    clearInterval(timerRef.current)
    playTimeout()
    setMood('sad')
    setRevealed(true)
    setTimeout(advance, 1400)
  }

  function handleSelect(choice) {
    if (selected !== null || revealed || lockedRef.current) return
    clearInterval(timerRef.current)
    lockedRef.current = true
    setSelected(choice)

    if (choice === question.answer) {
      setMood('happy')
      scoreRef.current += 1
      setScore(scoreRef.current)
      playCorrect()
      setTimeout(advance, 1000)
    } else {
      setMood('sad')
      playWrong()
      setShakeKey(k => k + 1)
      const newWrong = wrongCount + 1
      setWrongCount(newWrong)
      if (newWrong >= 2) {
        setRevealed(true)
        setTimeout(advance, 1400)
      } else {
        // One more chance — restart timer
        setTimeout(() => {
          lockedRef.current = false
          setSelected(null)
          setMood('normal')
          // restart timer with same question
          setTimeLeft(timeLimit)
          timerRef.current = setInterval(() => {
            setTimeLeft(t => {
              const next = parseFloat((t - 0.1).toFixed(1))
              if (next <= 0) {
                clearInterval(timerRef.current)
                setTimeout(() => {
                  if (!lockedRef.current) handleTimeout()
                }, 0)
                return 0
              }
              return next
            })
          }, 100)
        }, 700)
      }
    }
  }

  function advance() {
    if (questionNum >= TOTAL) {
      onFinish(scoreRef.current)
      return
    }
    setQuestionNum(n => n + 1)
    setQuestion(makeQuestion())
    setSelected(null)
    setRevealed(false)
    setWrongCount(0)
    setMood('normal')
    setShakeKey(0)
  }

  const pct = (timeLeft / timeLimit) * 100
  const timerClass = pct > 50 ? '' : pct > 25 ? 'warn' : 'danger'

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#888', fontSize: 17 }}>문제 {questionNum} / {TOTAL}</span>
        <span className="score-text">✅ {score}</span>
      </div>
      <div className="progress-bar-bg" style={{ marginBottom: 8 }}>
        <div className="progress-bar-fill" style={{ width: `${((questionNum - 1) / TOTAL) * 100}%` }} />
      </div>

      {/* Timer bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>⏱</span>
        <div className="timer-bar-bg" style={{ flex: 1 }}>
          <div
            className={`timer-bar-fill ${timerClass}`}
            style={{ width: `${pct}%`, transition: 'width 0.1s linear' }}
          />
        </div>
        <span style={{
          fontWeight: 900, fontSize: 20, minWidth: 48,
          color: pct < 25 ? '#e03030' : pct < 50 ? '#FF9F45' : '#333',
          transition: 'color 0.3s',
        }}>
          {timeLeft.toFixed(1)}s
        </span>
      </div>

      {/* Character + bubble */}
      <div className="character-area" style={{ marginBottom: 14 }}>
        <CharacterSVG mood={mood} />
        <div style={{ position: 'relative', flex: 1 }}>
          <div className="speech-bubble">
            <div
              key={shakeKey}
              className={shakeKey > 0 ? 'shake' : ''}
              style={{ display: 'inline-block' }}
            >
              {question.dan} × {question.k} = ?
            </div>
          </div>
          {wrongCount === 1 && !revealed && (
            <div style={{ marginTop: 8, color: '#e03030', fontWeight: 700, fontSize: 16 }}>
              ⚠️ 한 번 더 기회!
            </div>
          )}
          {revealed && (
            <div style={{ marginTop: 8, color: '#e03030', fontWeight: 700, fontSize: 16 }}>
              💡 정답은 <strong>{question.answer}</strong>이에요!
            </div>
          )}
        </div>
      </div>

      <div className="choices">
        {question.choices.map(c => {
          let cls = 'choice-btn'
          if (revealed && c === question.answer) cls += ' correct'
          else if (selected !== null && c === question.answer && selected === c) cls += ' correct'
          else if (selected === c && c !== question.answer) cls += ' wrong'
          return (
            <button
              key={c}
              className={cls}
              onClick={() => handleSelect(c)}
              disabled={(selected !== null || revealed) && c !== question.answer}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}
