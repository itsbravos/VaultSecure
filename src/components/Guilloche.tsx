import React, { useMemo } from 'react';

interface Band {
  radius: number; // base radius of the band
  amplitude: number; // how far the wave swings in/out
  lobes: number; // number of petals around the circle
  strands: number; // overlapping phase-shifted copies (creates the moiré weave)
}

interface GuillocheProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  bands?: Band[];
  className?: string;
}

const DEFAULT_BANDS: Band[] = [
  { radius: 92, amplitude: 6, lobes: 24, strands: 14 },
  { radius: 70, amplitude: 9, lobes: 16, strands: 12 },
  { radius: 44, amplitude: 8, lobes: 10, strands: 10 },
];

// Polar wave r(θ) = R + A·sin(nθ + φ); many phase-shifted strands of the same
// wave interleave into the engraved rosettes printed on banknotes.
const bandPaths = ({ radius, amplitude, lobes, strands }: Band) => {
  const steps = 480;
  return Array.from({ length: strands }, (_, s) => {
    const phase = (s / strands) * Math.PI * 2;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = radius + amplitude * Math.sin(lobes * t + phase);
      d += `${i === 0 ? 'M' : 'L'}${(100 + r * Math.cos(t)).toFixed(2)} ${(100 + r * Math.sin(t)).toFixed(2)}`;
    }
    return d + 'Z';
  });
};

export const Guilloche: React.FC<GuillocheProps> = ({
  size = 200,
  color = 'currentColor',
  strokeWidth = 0.35,
  bands = DEFAULT_BANDS,
  className,
}) => {
  const paths = useMemo(() => bands.flatMap(bandPaths), [bands]);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      aria-hidden
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
};
