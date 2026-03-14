interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="64" height="64" rx="14" fill="#00C896" />

        <polygon
          points="32,3 50,11 14,11"
          fill="#0A0A0F"
          opacity="0.9"
        />
        <rect x="20" y="11" width="24" height="3" rx="1" fill="#0A0A0F" opacity="0.9" />
        <rect x="29.5" y="1" width="5" height="4" rx="1.5" fill="#FFD700" />

        <rect x="7" y="19" width="6" height="24" rx="2" fill="#0A0A0F" opacity="0.85" />
        <rect x="8.5" y="16" width="3" height="3" rx="1" fill="#0A0A0F" opacity="0.5" />
        <rect x="8.5" y="43" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.5" />

        <rect x="17" y="25" width="6" height="18" rx="2" fill="#0A0A0F" opacity="0.65" />
        <rect x="18.5" y="21" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.4" />
        <rect x="18.5" y="43" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.4" />

        <text
          x="10"
          y="57"
          fontFamily="Inter, system-ui, Arial, sans-serif"
          fontWeight="800"
          fontSize="14"
          fill="#0A0A0F"
          textAnchor="middle"
          opacity="0.95"
        >I</text>

        <rect x="29" y="17" width="6" height="26" rx="2" fill="#0A0A0F" opacity="0.85" />
        <rect x="30.5" y="14" width="3" height="3" rx="1" fill="#0A0A0F" opacity="0.5" />
        <rect x="30.5" y="43" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.5" />

        <rect x="39" y="22" width="6" height="21" rx="2" fill="#0A0A0F" opacity="0.65" />
        <rect x="40.5" y="18" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.4" />
        <rect x="40.5" y="43" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.4" />

        <text
          x="36"
          y="57"
          fontFamily="Inter, system-ui, Arial, sans-serif"
          fontWeight="800"
          fontSize="14"
          fill="#0A0A0F"
          textAnchor="middle"
          opacity="0.95"
        >C</text>

        <rect x="51" y="19" width="6" height="24" rx="2" fill="#0A0A0F" opacity="0.85" />
        <rect x="52.5" y="15" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.5" />
        <rect x="52.5" y="43" width="3" height="4" rx="1" fill="#0A0A0F" opacity="0.5" />

        <text
          x="54"
          y="57"
          fontFamily="Inter, system-ui, Arial, sans-serif"
          fontWeight="800"
          fontSize="14"
          fill="#0A0A0F"
          textAnchor="middle"
          opacity="0.95"
        >T</text>
      </svg>
    </div>
  );
}
