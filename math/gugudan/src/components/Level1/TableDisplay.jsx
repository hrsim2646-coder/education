import { useState, useEffect } from 'react'

const DAN_COLORS = {
  2: '#FFD93D', 3: '#FF9F45', 4: '#FF6B9D',
  5: '#C77DFF', 6: '#4D96FF', 7: '#6BCB77',
  8: '#00C9A7', 9: '#FF6B6B',
}

export default function TableDisplay({ dan, onNext }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const rows = Array.from({ length: 9 }, (_, i) => i + 1)

  useEffect(() => {
    setVisibleCount(0)
    let count = 0
    const timer = setInterval(() => {
      count++
      setVisibleCount(count)
      if (count >= 9) clearInterval(timer)
    }, 200)
    return () => clearInterval(timer)
  }, [dan])

  const color = DAN_COLORS[dan] || '#FFD93D'

  return (
    <div className="card" style={{ borderTop: `6px solid ${color}` }}>
      <h2 style={{ marginBottom: 16, color: '#333' }}>
        <span style={{ background: color, borderRadius: 10, padding: '4px 14px' }}>{dan}단</span>
      </h2>
      <div className="table-grid">
        {rows.map(k => (
          <div
            key={k}
            className="table-row"
            style={{
              opacity: k <= visibleCount ? 1 : 0,
              transition: 'opacity 0.2s',
              borderLeftColor: color,
            }}
          >
            {dan} × {k} = <strong style={{ color: '#1565c0', marginLeft: 4 }}>{dan * k}</strong>
          </div>
        ))}
      </div>
      <button
        className="btn btn-yellow"
        style={{ marginTop: 20, width: '100%' }}
        onClick={onNext}
        disabled={visibleCount < 9}
      >
        객관식 문제 풀기 →
      </button>
    </div>
  )
}
