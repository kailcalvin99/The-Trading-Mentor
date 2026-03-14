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
        <rect width="64" height="64" rx="14" fill="#0C0C14" />
        <rect x="1" y="1" width="62" height="62" rx="13" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" />

        <path d="M14 40 L22 28 L30 33 L38 18 L46 26" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        <circle cx="14" cy="40" r="2" fill="#C5A44E" />
        <circle cx="22" cy="28" r="2" fill="#D4AF37" />
        <circle cx="30" cy="33" r="2" fill="#D4AF37" />
        <circle cx="38" cy="18" r="2.5" fill="#E8C547" />
        <circle cx="46" cy="26" r="2" fill="#D4AF37" />

        <circle cx="38" cy="18" r="5" fill="none" stroke="#E8C547" strokeWidth="0.8" opacity="0.4">
          <animate attributeName="r" values="5;8;5" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>

        <path d="M50 40 L50 50 M45 45 L55 45" stroke="url(#goldGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

        <text
          x="32"
          y="58"
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="700"
          fontSize="10"
          fill="url(#goldGrad)"
          textAnchor="middle"
          letterSpacing="2"
        >ICT AI</text>

        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor="#E8C547" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#C5A44E" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
