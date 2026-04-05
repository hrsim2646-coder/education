import { useEffect, useState } from 'react'

export default function SplashScreen({ onStart }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // short delay so splash renders before animation starts
    const t = setTimeout(() => setReady(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="splash"
      onClick={onStart}
      style={{
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 45%, #0a3d62 100%)',
      }}
    >
      {/* Background stars */}
      <Stars />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          opacity: ready ? 1 : 0,
          transform: ready ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        {/* Bear with stars */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <SplashBear />
          <span style={{ position: 'absolute', top: -10, right: -10, fontSize: 28 }}>✨</span>
          <span style={{ position: 'absolute', top: 10, left: -14, fontSize: 20 }}>⭐</span>
        </div>

        {/* App title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#FFD93D',
            letterSpacing: -2,
            lineHeight: 1,
            textShadow: '0 4px 20px rgba(255,217,61,0.4)',
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          심구단
        </div>

        <div
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 8,
            letterSpacing: 1,
          }}
        >
          패밀리 구구단 공부앱
        </div>

        {/* Divider */}
        <div
          style={{
            width: 60,
            height: 3,
            background: 'linear-gradient(90deg, #FFD93D, #FF9F45)',
            borderRadius: 99,
            margin: '20px auto',
          }}
        />

        {/* Tap to start */}
        <div
          className="splash-tap"
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          ✨ 터치해서 시작!
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 14,
        }}
      >
        우리 가족 함께 하는 구구단 🌟
      </div>
    </div>
  )
}

function Stars() {
  const stars = [
    { x: '8%',  y: '12%', size: 18, delay: 0 },
    { x: '88%', y: '8%',  size: 24, delay: 0.5 },
    { x: '75%', y: '20%', size: 14, delay: 1 },
    { x: '15%', y: '30%', size: 10, delay: 1.5 },
    { x: '92%', y: '40%', size: 16, delay: 0.8 },
    { x: '5%',  y: '55%', size: 12, delay: 1.2 },
    { x: '80%', y: '65%', size: 20, delay: 0.3 },
    { x: '20%', y: '70%', size: 8,  delay: 2 },
    { x: '60%', y: '78%', size: 14, delay: 0.7 },
    { x: '40%', y: '88%', size: 10, delay: 1.7 },
  ]
  return (
    <>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            animation: `starTwinkle 2s ${s.delay}s ease-in-out infinite alternate`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z"
              fill="rgba(255,217,61,0.6)"
            />
          </svg>
        </div>
      ))}
    </>
  )
}

function SplashBear() {
  return (
    <svg width="120" height="130" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="38" r="20" fill="#8B5E3C" />
      <circle cx="92" cy="38" r="20" fill="#8B5E3C" />
      <circle cx="28" cy="38" r="13" fill="#D4956A" />
      <circle cx="92" cy="38" r="13" fill="#D4956A" />
      <ellipse cx="60" cy="118" rx="32" ry="24" fill="#8B5E3C" />
      <circle cx="60" cy="70" r="44" fill="#A0714A" />
      <ellipse cx="60" cy="80" rx="28" ry="22" fill="#D4956A" />
      <circle cx="46" cy="60" r="7" fill="#2d2d2d" />
      <circle cx="74" cy="60" r="7" fill="#2d2d2d" />
      <circle cx="48" cy="58" r="2.5" fill="white" />
      <circle cx="76" cy="58" r="2.5" fill="white" />
      <ellipse cx="60" cy="72" rx="5" ry="4" fill="#4a2c0a" />
      {/* Happy smile */}
      <path d="M 50 78 Q 60 88 70 78" stroke="#4a2c0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="74" r="7" fill="#ffb3b3" opacity="0.6" />
      <circle cx="86" cy="74" r="7" fill="#ffb3b3" opacity="0.6" />
      <ellipse cx="60" cy="118" rx="18" ry="14" fill="#D4956A" />
      <ellipse cx="28" cy="118" rx="12" ry="8" fill="#8B5E3C" transform="rotate(-20 28 118)" />
      <ellipse cx="92" cy="118" rx="12" ry="8" fill="#8B5E3C" transform="rotate(20 92 118)" />
      {/* Stars on belly */}
      <text x="52" y="122" fontSize="14" fill="rgba(255,217,61,0.8)">★</text>
    </svg>
  )
}
