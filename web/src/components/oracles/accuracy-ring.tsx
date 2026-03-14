/// SVG circular progress ring showing KOL accuracy percentage
interface AccuracyRingProps {
  accuracy: number; // 0-100
}

export function AccuracyRing({ accuracy }: AccuracyRingProps) {
  const size = 48;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  const strokeColor =
    accuracy > 75 ? "#1D9E75" : accuracy >= 50 ? "#EF9F27" : "#E24B4A";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={4}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={strokeColor}
        fontSize="10"
        fontWeight="700"
      >
        {Math.round(accuracy)}%
      </text>
    </svg>
  );
}
