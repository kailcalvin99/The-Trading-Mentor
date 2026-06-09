interface LogoProps {
  size?: number;
  className?: string;
}

const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt="ICT AI Trading Mentor"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
