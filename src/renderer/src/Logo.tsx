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
      {/* simple bubble "S" */}
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fontFamily="'Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
        fontWeight={900}
        fontSize={46}
        fill="#16a34a"
        stroke="#141414"
        strokeWidth={4}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      >
        S
      </text>
      <path d="M20,17 q7,-6 14,-1" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
    </svg>
  );
}
