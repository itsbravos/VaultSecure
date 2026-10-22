// Generates src/assets/icon.svg (and public/icon.svg): the guilloché seal used as
// the app logo, tuned for small sizes — fewer strands and a heavier line than the
// in-app version so it stays legible as a 16px tab icon.
// Run: node scripts/make-icon.mjs && npx pwa-assets-generator
import { writeFileSync } from 'node:fs';

const INK = '#0E1F24';
const BRASS = '#C9A54C';

const BANDS = [
  { radius: 74, amplitude: 7, lobes: 16, strands: 7 },
  { radius: 52, amplitude: 7, lobes: 10, strands: 6 },
];

const paths = BANDS.flatMap(({ radius, amplitude, lobes, strands }) =>
  Array.from({ length: strands }, (_, s) => {
    const phase = (s / strands) * Math.PI * 2;
    let d = '';
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      const r = radius + amplitude * Math.sin(lobes * t + phase);
      d += `${i ? 'L' : 'M'}${(100 + r * Math.cos(t)).toFixed(1)} ${(100 + r * Math.sin(t)).toFixed(1)}`;
    }
    return `<path d="${d}Z"/>`;
  })
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="44" fill="${INK}"/>
  <g fill="none" stroke="${BRASS}" stroke-width="2.2" stroke-linejoin="round">${paths.join('')}</g>
  <circle cx="100" cy="100" r="30" fill="${INK}" stroke="${BRASS}" stroke-width="4"/>
  <rect x="88" y="98" width="24" height="18" rx="4" fill="${BRASS}"/>
  <path d="M93 98v-6a7 7 0 0 1 14 0v6" fill="none" stroke="${BRASS}" stroke-width="4" stroke-linecap="round"/>
</svg>
`;

for (const out of ['src/assets/icon.svg', 'public/icon.svg']) writeFileSync(out, svg);
console.log('icon.svg written');
