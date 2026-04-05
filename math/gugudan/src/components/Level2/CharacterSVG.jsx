// Cute bear character SVG (inline, no image files needed)
export default function CharacterSVG({ mood = 'normal' }) {
  // mood: normal | happy | sad
  const eyeY = mood === 'happy' ? 62 : 60
  const mouthD = mood === 'happy'
    ? 'M 52 78 Q 60 86 68 78'
    : mood === 'sad'
    ? 'M 52 82 Q 60 76 68 82'
    : 'M 52 78 Q 60 82 68 78'

  return (
    <svg width="110" height="130" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <circle cx="28" cy="38" r="20" fill="#8B5E3C" />
      <circle cx="92" cy="38" r="20" fill="#8B5E3C" />
      <circle cx="28" cy="38" r="13" fill="#D4956A" />
      <circle cx="92" cy="38" r="13" fill="#D4956A" />

      {/* Body */}
      <ellipse cx="60" cy="118" rx="32" ry="24" fill="#8B5E3C" />

      {/* Head */}
      <circle cx="60" cy="70" r="44" fill="#A0714A" />

      {/* Face highlight */}
      <ellipse cx="60" cy="80" rx="28" ry="22" fill="#D4956A" />

      {/* Eyes */}
      <circle cx="46" cy={eyeY} r="7" fill="#2d2d2d" />
      <circle cx="74" cy={eyeY} r="7" fill="#2d2d2d" />
      <circle cx="48" cy={eyeY - 2} r="2.5" fill="white" />
      <circle cx="76" cy={eyeY - 2} r="2.5" fill="white" />

      {/* Nose */}
      <ellipse cx="60" cy="72" rx="5" ry="4" fill="#4a2c0a" />

      {/* Mouth */}
      <path d={mouthD} stroke="#4a2c0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Blush */}
      <circle cx="34" cy="74" r="7" fill="#ffb3b3" opacity="0.6" />
      <circle cx="86" cy="74" r="7" fill="#ffb3b3" opacity="0.6" />

      {/* Tummy */}
      <ellipse cx="60" cy="118" rx="18" ry="14" fill="#D4956A" />

      {/* Arms */}
      <ellipse cx="28" cy="118" rx="12" ry="8" fill="#8B5E3C" transform="rotate(-20 28 118)" />
      <ellipse cx="92" cy="118" rx="12" ry="8" fill="#8B5E3C" transform="rotate(20 92 118)" />
    </svg>
  )
}
