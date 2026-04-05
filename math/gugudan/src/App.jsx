import { useState } from 'react'
import LevelSelect from './components/LevelSelect'
import Level1 from './components/Level1/Level1'
import Level2 from './components/Level2/Level2'
import Level3 from './components/Level3/Level3'

export default function App() {
  const [level, setLevel] = useState(null)

  if (level === 1) return <Level1 onBack={() => setLevel(null)} />
  if (level === 2) return <Level2 onBack={() => setLevel(null)} />
  if (level === 3) return <Level3 onBack={() => setLevel(null)} />

  return <LevelSelect onSelect={setLevel} />
}
