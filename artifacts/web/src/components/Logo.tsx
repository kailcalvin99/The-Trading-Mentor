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

        <path d="M16 44 L24 28 L32 36 L40 20 L48 32" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        <circle cx="16" cy="44" r="2.5" fill="#C5A44E" />
        <circle cx="24" cy="28" r="2.5" fill="#D4AF37" />
        <circle cx="32" cy="36" r="2.5" fill="#D4AF37" />
        <circle cx="40" cy="20" r="2.5" fill="#E8C547" />
        <circle cx="48" cy="32" r="2.5" fill="#D4AF37" />

        <text
          x="32"
          y="57"
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="700"
          fontSize="11"
          fill="url(#goldGrad)"
          textAnchor="middle"
          letterSpacing="3"
        >ICT</text>

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
