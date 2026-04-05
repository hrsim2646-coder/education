import { useState } from 'react'
import TableDisplay from './TableDisplay'
import MultipleChoice from './MultipleChoice'
import FillIn from './FillIn'
import CumulativeTest from './CumulativeTest'

const STORAGE_KEY = 'shimgugudan_done_dans'
const PHASES = ['table', 'mc', 'fillin', 'cumulative']
const PHASE_LABELS = ['📖 외우기', '🔵 객관식', '✏️ 직접 쓰기', '📝 누적 테스트']
const DAN_COLORS = {
  2:'#FFD93D', 3:'#FF9F45', 4:'#FF6B9D',
  5:'#C77DFF', 6:'#4D96FF', 7:'#6BCB77',
  8:'#00C9A7', 9:'#FF6B6B',
}

function loadDoneDans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveDoneDans(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

export default function Level1({ onBack }) {
  const [doneDans, setDoneDans] = useState(loadDoneDans)
  const [selectedDan, setSelectedDan] = useState(null) // null = 단 선택 화면
  const [phase, setPhase] = useState('table')

  const phaseIndex = PHASES.indexOf(phase)

  function selectDan(dan) {
    setSelectedDan(dan)
    setPhase('table')
  }

  function advancePhase() {
    if (phase === 'table') {
      setPhase('mc')
    } else if (phase === 'mc') {
      setPhase('fillin')
    } else if (phase === 'fillin') {
      // 누적 테스트: 현재단 포함해서 2개 이상의 단을 알아야 가능
      const allKnown = [...new Set([...doneDans, selectedDan])]
      if (allKnown.length >= 2) {
        setPhase('cumulative')
      } else {
        finishDan()
      }
    } else if (phase === 'cumulative') {
      finishDan()
    }
  }

  function finishDan() {
    if (!doneDans.includes(selectedDan)) {
      const updated = [...doneDans, selectedDan]
      setDoneDans(updated)
      saveDoneDans(updated)
    }
    setSelectedDan(null) // 단 선택 화면으로 복귀
  }

  // ── 단 선택 화면 ──────────────────────────────────────────────
  if (selectedDan === null) {
    const allDone = doneDans.length === 8
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="back-btn" onClick={onBack}>← 뒤로</button>
          {doneDans.length > 0 && (
            <button
              className="btn-sm btn btn-gray"
              onClick={() => { setDoneDans([]); saveDoneDans([]) }}
              style={{ fontSize: 14, padding: '6px 12px' }}
            >
              진도 초기화
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>📚</div>
          <h2 style={{ fontSize: 26 }}>어떤 단을 공부할까요?</h2>
          {doneDans.length > 0 && (
            <p style={{ color: '#6BCB77', fontSize: 16, fontWeight: 700, marginTop: 4 }}>
              ✅ 완료: {doneDans.map(d => d + '단').join(', ')}
            </p>
          )}
        </div>

        {/* Dan grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, width: '100%' }}>
          {[2,3,4,5,6,7,8,9].map(d => {
            const done = doneDans.includes(d)
            return (
              <button
                key={d}
                onClick={() => selectDan(d)}
                style={{
                  background: done ? DAN_COLORS[d] : '#f5f5f5',
                  border: `3px solid ${done ? DAN_COLORS[d] : '#ddd'}`,
                  borderRadius: 20,
                  padding: '18px 8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 900,
                  fontSize: 22,
                  color: done ? '#333' : '#888',
                  transition: 'all 0.15s',
                  boxShadow: done ? '0 4px 10px rgba(0,0,0,0.12)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{d}단</span>
                {done && <span style={{ fontSize: 16 }}>✅</span>}
              </button>
            )
          })}
        </div>

        {allDone && (
          <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #FFD93D' }}>
            <div style={{ fontSize: 36 }}>🏆</div>
            <p style={{ fontWeight: 700, fontSize: 20, marginTop: 4 }}>2~9단 모두 완료! 대단해요!</p>
          </div>
        )}
      </div>
    )
  }

  // ── 학습 화면 ──────────────────────────────────────────────────
  const color = DAN_COLORS[selectedDan]
  const allKnown = [...new Set([...doneDans, selectedDan])]
  const phases = allKnown.length >= 2 ? PHASES : PHASES.slice(0, 3)
  const dots = phases.map(p => ({
    key: p,
    state: PHASES.indexOf(p) < phaseIndex ? 'done' : p === phase ? 'active' : '',
  }))

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <button className="back-btn" onClick={() => setSelectedDan(null)}>← 단 선택</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              background: color, borderRadius: 10, padding: '4px 12px',
              fontWeight: 900, fontSize: 18,
            }}
          >
            {selectedDan}단
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#555' }}>
            {PHASE_LABELS[phaseIndex]}
          </span>
        </div>
      </div>

      {/* Phase dots */}
      <div className="phase-indicator">
        {dots.map(dot => (
          <div key={dot.key} className={`phase-dot ${dot.state}`} />
        ))}
      </div>

      {/* Phase content */}
      {phase === 'table' && (
        <TableDisplay dan={selectedDan} onNext={advancePhase} />
      )}
      {phase === 'mc' && (
        <MultipleChoice dan={selectedDan} onNext={advancePhase} />
      )}
      {phase === 'fillin' && (
        <FillIn dan={selectedDan} onNext={advancePhase} />
      )}
      {phase === 'cumulative' && allKnown.length >= 2 && (
        <CumulativeTest learnedDans={allKnown} onNext={advancePhase} />
      )}
    </div>
  )
}
