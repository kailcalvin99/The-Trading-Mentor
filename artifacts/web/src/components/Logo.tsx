interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  const p = size / 32;
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="8" fill="#00C896" />

        <rect x="6" y="13" width="3" height="10" rx="1" fill="#0A0A0F" opacity="0.7" />
        <rect x="7" y="10" width="1" height="3" rx="0.5" fill="#0A0A0F" opacity="0.5" />
        <rect x="7" y="23" width="1" height="2" rx="0.5" fill="#0A0A0F" opacity="0.5" />

        <rect x="12" y="7" width="3.5" height="14" rx="1" fill="#0A0A0F" />
        <rect x="13.25" y="4" width="1.5" height="3" rx="0.75" fill="#0A0A0F" opacity="0.7" />
        <rect x="13.25" y="21" width="1.5" height="3" rx="0.75" fill="#0A0A0F" opacity="0.7" />

        <rect x="19" y="11" width="3" height="8" rx="1" fill="#0A0A0F" opacity="0.8" />
        <rect x="20" y="8" width="1" height="3" rx="0.5" fill="#0A0A0F" opacity="0.5" />
        <rect x="20" y="19" width="1" height="2.5" rx="0.5" fill="#0A0A0F" opacity="0.5" />

        <path
          d={`M ${5 * p} ${22 * p} Q ${10 * p} ${15 * p} ${14 * p} ${9 * p} T ${27 * p} ${6 * p}`}
          stroke="#0A0A0F"
          strokeWidth={1.5 * p}
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />

        <circle cx="26" cy="7" r="3.5" fill="#0A0A0F" opacity="0.9" />
        <path
          d="M 24.5 7 L 25.7 8.2 L 27.8 5.8"
          stroke="#00C896"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
