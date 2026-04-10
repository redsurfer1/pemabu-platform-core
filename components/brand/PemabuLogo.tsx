'use client';

interface PemabuLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

export function PemabuLogo({ className = '', size = 40, showWordmark = false }: PemabuLogoProps) {
  const uid = `pg-${size}`;
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Pemabu logo"
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0c1f1e" />
            <stop offset="100%" stopColor="#071413" />
          </linearGradient>
          <linearGradient id={`${uid}-p`} x1="8" y1="8" x2="28" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="55%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.05  0 0 0 0 0.58  0 0 0 0 0.53  0 0 0 0.5 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill={`url(#${uid}-bg)`} />
        <rect x="0.5" y="0.5" width="39" height="39" rx="9" stroke="rgba(13,148,136,0.4)" strokeWidth="1" fill="none" />

        <g filter={`url(#${uid}-glow)`}>
          <line
            x1="12.5" y1="10" x2="12.5" y2="30"
            stroke={`url(#${uid}-p)`}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M12.5 10 L21 10 Q28 10 28 17 Q28 24 21 24 L12.5 24"
            fill="none"
            stroke={`url(#${uid}-p)`}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <line
            x1="12.5" y1="17"
            x2="23" y2="17"
            stroke="rgba(94,234,212,0.3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        <circle cx="33.5" cy="7.5" r="2.5" fill="#0d9488" opacity="0.6" />
        <circle cx="33.5" cy="7.5" r="1.2" fill="#5eead4" opacity="0.9" />
      </svg>

      {showWordmark && (
        <span
          className="font-semibold tracking-tight text-neutral-100"
          style={{ fontSize: Math.round(size * 0.45), letterSpacing: '-0.02em' }}
        >
          Pemabu
        </span>
      )}
    </div>
  );
}

export function PemabuLogoMark({ className = '', size = 32 }: { className?: string; size?: number }) {
  const uid = `pm-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pemabu"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0c1f1e" />
          <stop offset="100%" stopColor="#071413" />
        </linearGradient>
        <linearGradient id={`${uid}-p`} x1="8" y1="8" x2="28" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="55%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.05  0 0 0 0 0.58  0 0 0 0 0.53  0 0 0 0.5 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill={`url(#${uid}-bg)`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="9" stroke="rgba(13,148,136,0.4)" strokeWidth="1" fill="none" />

      <g filter={`url(#${uid}-glow)`}>
        <line x1="12.5" y1="10" x2="12.5" y2="30" stroke={`url(#${uid}-p)`} strokeWidth="3" strokeLinecap="round" />
        <path
          d="M12.5 10 L21 10 Q28 10 28 17 Q28 24 21 24 L12.5 24"
          fill="none"
          stroke={`url(#${uid}-p)`}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>

      <circle cx="33.5" cy="7.5" r="2.5" fill="#0d9488" opacity="0.6" />
      <circle cx="33.5" cy="7.5" r="1.2" fill="#5eead4" opacity="0.9" />
    </svg>
  );
}
