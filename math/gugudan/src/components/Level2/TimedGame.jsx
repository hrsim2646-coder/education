import { useState, useEffect, useRef } from 'react'
import { playCorrect, playWrong, playTimeout } from '../../utils/sound'
import CharacterSVG from './CharacterSVG'

const TOTAL = 10
const TIME_LIMITS = { 1: 20, 2: 10, 3: 5 }

function makeQuestion() {
  const dan = Math.floor(Math.random() * 8) + 2
  const k = Math.floor(Math.random() * 9) + 1
  return { dan, k, answer: dan * k }
}

export default function TimedGame({ stage, onFinish }) {
  const timeLimit = TIME_LIMITS[stage]
  const [questions] = useState(() => Array.from({ length: TOTAL }, makeQuestion))
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [mood, setMood] = useState('normal')
  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const gameOverRef = useRef(false)
  const scoreRef = useRef(0)

  useEffect(() => {
    gameOverRef.current = false
    setTimeLeft(timeLimit)
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [idx])

  useEffect(() => {
    if (inputRef.current && !gameOver) inputRef.current.focus()
  }, [idx, gameOver])

  function startTimer() {
    clearInterval(timerRef.current)
    setTimeLeft(timeLimit)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const next = Math.max(0, parseFloat((t - 0.1).toFixed(1)))
        if (next <= 0) {
          clearInterval(timerRef.current)
          setTimeout(() => {
            if (!gameOverRef.current) handleTimeout()
          }, 0)
          return 0
        }
        return next
      })
    }, 100)
  }

  function handleTimeout() {
    if (gameOverRef.current) return
    gameOverRef.current = true
    playTimeout()
    setMood('sad')
    setGameOver(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (feedback !== null || gameOver) return
    clearInterval(timerRef.current)
    gameOverRef.current = true // prevent timeout race

    const num = parseInt(value, 10)
    const q = questions[idx]
    const isCorrect = num === q.answer

    if (isCorrect) {
      setFeedback('correct')
      setMood('happy')
      scoreRef.current += 1
      setScore(scoreRef.current)
      playCorrect()
    } else {
      setFeedback('wrong')
      setMood('sad')
      playWrong()
    }

    setTimeout(() => {
      if (idx + 1 >= TOTAL) {
        onFinish(scoreRef.current)
        return
      }
      gameOverRef.current = false
      setIdx(i => i + 1)
      setValue('')
      setFeedback(null)
      setMood('normal')
    }, 800)
  }

  const q = questions[Math.min(idx, TOTAL - 1)]
  const pct = (timeLeft / timeLimit) * 100
  const timerClass = pct > 50 ? '' : pct > 25 ? 'warn' : 'danger'

  if (gameOver) {
    return (
      <div className="card">
        <div className="result-screen">
          <CharacterSVG mood="sad" />
          <div style={{ fontSize: 48 }}>⏰</div>
          <h2 style={{ color: '#e03030' }}>시간 초과!</h2>
          <p style={{ fontSize: 20, color: '#666' }}>
            {idx + 1}번 문제에서 시간이 끝났어요
          </p>
          <p className="score-text">점수: {score} / {idx}</p>
          <button className="btn btn-orange btn-lg" onClick={() => onFinish(score)}>
            결과 보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#888', fontSize: 17 }}>문제 {idx + 1} / {TOTAL}</span>
        <span className="score-text">✅ {score}</span>
      </div>
      <div className="progress-bar-bg" style={{ marginBottom: 8 }}>
        <div className="progress-bar-fill" style={{ width: `${(idx / TOTAL) * 100}%` }} />
      </div>

      {/* Smooth timer bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>⏱</span>
        <div className="timer-bar-bg" style={{ flex: 1 }}>
          <div
            className={`timer-bar-fill ${timerClass}`}
            style={{ width: `${pct}%`, transition: 'width 0.1s linear' }}
          />
        </div>
        <span style={{
          fontWeight: 900, fontSize: 22, minWidth: 48,
          color: pct < 25 ? '#e03030' : pct < 50 ? '#FF9F45' : '#333',
          transition: 'color 0.3s',
        }}>
          {timeLeft.toFixed(1)}s
        </span>
      </div>

      {/* Character + bubble */}
      <div className="character-area" style={{ marginBottom: 12 }}>
        <CharacterSVG mood={mood} />
        <div className="speech-bubble" style={{ fontSize: 36 }}>
          {q.dan} × {q.k} = ?
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
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
          className="btn btn-green"
          style={{ width: '100%' }}
          disabled={!value || feedback !== null}
        >
          확인
        </button>
      </form>
    </div>
  )
}
