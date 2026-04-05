import { useState } from 'react'
import SplashScreen from './components/SplashScreen'
import LevelSelect from './components/LevelSelect'
import Level1 from './components/Level1/Level1'
import Level2 from './components/Level2/Level2'
import Level3 from './components/Level3/Level3'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const [level, setLevel] = useState(null)

  if (!splashDone) {
    return <SplashScreen onStart={() => setSplashDone(true)} />
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Persistent header */}
      <header className="app-header">
        <button
          className="app-header-title"
          onClick={() => { setLevel(null) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          <span className="app-header-logo">심구단</span>
          <span className="app-header-sub">패밀리 구구단 공부앱</span>
        </button>
      </header>

      {/* Content */}
      {level === 1 && <Level1 onBack={() => setLevel(null)} />}
      {level === 2 && <Level2 onBack={() => setLevel(null)} />}
      {level === 3 && <Level3 onBack={() => setLevel(null)} />}
      {level === null && <LevelSelect onSelect={setLevel} />}
    </div>
  )
}
