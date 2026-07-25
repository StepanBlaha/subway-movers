export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#ff3d7f" stroke="#ffffff" strokeWidth={4} />
      <text
        x="32"
        y="47"
        textAnchor="middle"
        fontFamily="'Bungee','Arial Black',Arial,sans-serif"
        fontWeight={900}
        fontSize={40}
        fill="#ffffff"
        stroke="#151515"
        strokeWidth={2.5}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      >
        S
      </text>
    </svg>
  );
}
