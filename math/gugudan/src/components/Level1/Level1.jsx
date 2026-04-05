import { useState } from 'react'
import TableDisplay from './TableDisplay'
import MultipleChoice from './MultipleChoice'
import FillIn from './FillIn'
import CumulativeTest from './CumulativeTest'

// phases per dan: table → mc → fillin → cumulative (cumulative only from 3단+)
const PHASES = ['table', 'mc', 'fillin', 'cumulative']
const PHASE_LABELS = ['📖 외우기', '🔵 객관식', '✏️ 직접 쓰기', '📝 누적 테스트']

export default function Level1({ onBack }) {
  const [currentDan, setCurrentDan] = useState(2)
  const [phase, setPhase] = useState('table') // table | mc | fillin | cumulative | done
  const [doneDans, setDoneDans] = useState([])

  const phaseIndex = PHASES.indexOf(phase)

  function advancePhase() {
    if (phase === 'table') {
      setPhase('mc')
    } else if (phase === 'mc') {
      setPhase('fillin')
    } else if (phase === 'fillin') {
      // cumulative from 3단 onwards (needs at least 2 dans)
      if (currentDan >= 3) {
        setPhase('cumulative')
      } else {
        finishDan()
      }
    } else if (phase === 'cumulative') {
      finishDan()
    }
  }

  function finishDan() {
    const newDone = [...doneDans, currentDan]
    setDoneDans(newDone)
    if (currentDan < 9) {
      setCurrentDan(prev => prev + 1)
      setPhase('table')
    } else {
      setPhase('done')
    }
  }

  if (phase === 'done') {
    return (
      <div className="page">
        <div className="result-screen">
          <div className="result-big">🏆</div>
          <h1>완료!</h1>
          <p className="big-text">2단~9단 모두 마스터!</p>
          <button className="btn btn-yellow btn-lg" onClick={onBack}>처음으로</button>
        </div>
      </div>
    )
  }

  const phases = currentDan >= 3 ? PHASES : PHASES.slice(0, 3)
  const dots = phases.map(p => ({
    key: p,
    state: PHASES.indexOf(p) < phaseIndex ? 'done' : p === phase ? 'active' : '',
  }))

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <button className="back-btn" onClick={onBack}>← 뒤로</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#555' }}>
          {currentDan}단 — {PHASE_LABELS[phaseIndex]}
        </span>
      </div>

      {/* Dan progress dots */}
      <div className="gap-row">
        {[2,3,4,5,6,7,8,9].map(d => (
          <div
            key={d}
            className={`dan-badge ${doneDans.includes(d) ? 'done' : d === currentDan ? 'current' : 'locked'}`}
          >
            {d}단
          </div>
        ))}
      </div>

      {/* Phase dots */}
      <div className="phase-indicator">
        {dots.map(dot => (
          <div key={dot.key} className={`phase-dot ${dot.state}`} />
        ))}
      </div>

      {/* Phase content */}
      {phase === 'table' && (
        <TableDisplay dan={currentDan} onNext={advancePhase} />
      )}
      {phase === 'mc' && (
        <MultipleChoice dan={currentDan} onNext={advancePhase} />
      )}
      {phase === 'fillin' && (
        <FillIn dan={currentDan} onNext={advancePhase} />
      )}
      {phase === 'cumulative' && currentDan >= 3 && (
        <CumulativeTest maxDan={currentDan} onNext={advancePhase} />
      )}
    </div>
  )
}
