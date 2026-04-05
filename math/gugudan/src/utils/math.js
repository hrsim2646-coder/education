export function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Close wrong answers for small numbers (구구단)
export function generateWrongAnswers(correct, count = 3) {
  const candidates = [];
  for (let d = 1; d <= 6; d++) {
    if (correct - d > 0) candidates.push(correct - d);
    candidates.push(correct + d);
  }
  const pool = shuffle(candidates.filter(c => c !== correct));
  const unique = [...new Set(pool)];
  return unique.slice(0, count);
}

// For Level 3 large numbers: ±5~20% range
export function generateWrongAnswersLarge(correct, count = 3) {
  const wrongs = new Set();
  const minDiff = Math.max(1, Math.round(correct * 0.05));
  const maxDiff = Math.max(5, Math.round(correct * 0.25));
  let attempts = 0;
  while (wrongs.size < count && attempts < 200) {
    attempts++;
    const diff = Math.floor(Math.random() * (maxDiff - minDiff + 1)) + minDiff;
    const sign = Math.random() < 0.5 ? 1 : -1;
    const c = correct + sign * diff;
    if (c > 0 && c !== correct) wrongs.add(c);
  }
  return [...wrongs].slice(0, count);
}

// Weighted random from arbitrary ordered list: later index = higher weight
// e.g. [2, 5, 3, 7] → 7 gets weight 4, 3 gets weight 3, 5 gets 2, 2 gets 1
export function weightedRandomFromList(orderedList) {
  let total = 0;
  const entries = orderedList.map((dan, i) => {
    const w = i + 1;
    total += w;
    return { dan, weight: w };
  });
  let rand = Math.random() * total;
  for (const { dan, weight } of entries) {
    rand -= weight;
    if (rand <= 0) return dan;
  }
  return orderedList[orderedList.length - 1];
}

// Weighted random dan: higher dan = higher weight
// weights: 2단=1, 3단=2, ..., maxDan=(maxDan-1)
export function weightedRandomDan(maxDan) {
  const entries = [];
  let total = 0;
  for (let d = 2; d <= maxDan; d++) {
    const w = d - 1;
    entries.push({ dan: d, weight: w });
    total += w;
  }
  let rand = Math.random() * total;
  for (const { dan, weight } of entries) {
    rand -= weight;
    if (rand <= 0) return dan;
  }
  return maxDan;
}

// Random multiplier 1-9
export function randomMultiplier() {
  return Math.floor(Math.random() * 9) + 1;
}

// Random int in range [min, max] inclusive
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate Level 3 question by stage
export function generateLevel3Question(stage) {
  if (stage === 1) {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    return { a, b, answer: a * b };
  } else if (stage === 2) {
    const a = randInt(10, 99);
    const b = randInt(2, 9);
    return { a, b, answer: a * b };
  } else {
    const a = randInt(10, 999);
    const b = randInt(10, 99);
    return { a, b, answer: a * b };
  }
}
