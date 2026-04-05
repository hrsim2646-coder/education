import { useState, useEffect } from 'react'

const DAN_COLORS = {
  2: '#FFD93D', 3: '#FF9F45', 4: '#FF6B9D',
  5: '#C77DFF', 6: '#4D96FF', 7: '#6BCB77',
  8: '#00C9A7', 9: '#FF6B6B',
}

// Korean number words for 1-9
const KOR = { 1:'일', 2:'이', 3:'삼', 4:'사', 5:'오', 6:'육', 7:'칠', 8:'팔', 9:'구' }
// 은 after consonant-ending, 는 after vowel-ending
const EUN_NUN = { 1:'은', 2:'는', 3:'은', 4:'는', 5:'는', 6:'은', 7:'은', 8:'은', 9:'는' }

function numToKor(n) {
  if (n <= 9) return KOR[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  const tensStr = t === 1 ? '십' : KOR[t] + '십'
  return tensStr + (o > 0 ? KOR[o] : '')
}

function buildSpeechText(dan, k) {
  return `${KOR[dan]} ${KOR[k]}${EUN_NUN[k]} ${numToKor(dan * k)}`
}

function speakRow(dan, k) {
  if (!window.speechSynthesis) return
  const text = buildSpeechText(dan, k)

  const doSpeak = () => {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ko-KR'
    utter.rate = 0.82
    utter.pitch = 1.05
    const voices = window.speechSynthesis.getVoices()
    const korVoice = voices.find(v => v.lang === 'ko-KR') ||
                     voices.find(v => v.lang.startsWith('ko'))
    if (korVoice) utter.voice = korVoice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
  } else {
    doSpeak()
  }
}

export default function TableDisplay({ dan, onNext }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const rows = Array.from({ length: 9 }, (_, i) => i + 1)

  // Reset and animate rows when dan changes
  useEffect(() => {
    setVisibleCount(0)
    let count = 0
    const timer = setInterval(() => {
      count++
      setVisibleCount(count)
      if (count >= 9) clearInterval(timer)
    }, 700) // slower so speech can finish each row
    return () => {
      clearInterval(timer)
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [dan])

  // Speak each row as it becomes visible
  useEffect(() => {
    if (visibleCount >= 1 && visibleCount <= 9) {
      speakRow(dan, visibleCount)
    }
  }, [visibleCount, dan])

  const color = DAN_COLORS[dan] || '#FFD93D'

  return (
    <div className="card" style={{ borderTop: `6px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#333' }}>
          <span style={{ background: color, borderRadius: 10, padding: '4px 14px' }}>{dan}단</span>
        </h2>
        <span style={{ fontSize: 14, color: '#aaa' }}>🔊 음성 읽기</span>
      </div>
      <div className="table-grid">
        {rows.map(k => (
          <div
            key={k}
            className="table-row"
            style={{
              opacity: k <= visibleCount ? 1 : 0,
              transform: k <= visibleCount ? 'translateX(0)' : 'translateX(-16px)',
              transition: 'opacity 0.25s, transform 0.25s',
              borderLeftColor: color,
              background: k === visibleCount ? `${color}30` : undefined,
            }}
          >
            {dan} × {k} = <strong style={{ color: '#1565c0', marginLeft: 4 }}>{dan * k}</strong>
            {k === visibleCount && (
              <span style={{ marginLeft: 8, fontSize: 14, color: '#888' }}>
                ← {buildSpeechText(dan, k)}
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        className="btn btn-yellow"
        style={{ marginTop: 20, width: '100%' }}
        onClick={() => {
          if (window.speechSynthesis) window.speechSynthesis.cancel()
          onNext()
        }}
        disabled={visibleCount < 9}
      >
        {visibleCount < 9 ? `읽는 중... (${visibleCount}/9)` : '객관식 문제 풀기 →'}
      </button>
    </div>
  )
}
