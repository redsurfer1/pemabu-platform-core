'use client';

interface PemabuLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export default function PemabuLogo({
  className = '',
  size = 48,
  animate = true
}: PemabuLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="packetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#84cc16" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform="translate(50, 50)">
        {/* Outer Rectangle Frame */}
        <rect
          x="-28"
          y="-32"
          width="50"
          height="57"
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinejoin="miter"
        />

        {/* Central 'P' Letterform - Centered */}
        <g transform="translate(-6, -12)">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="24"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="butt"
          />
          <path
            d="M 0,0 L 8,0 Q 13,0 13,6 Q 13,12 8,12 L 0,12"
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
        </g>

        {/* Data Packet Animation - Settlement Reconciliation */}
        {animate && (
          <g>
            <circle
              cx="-28"
              cy="-32"
              r="3"
              fill="url(#packetGlow)"
              opacity="0"
            >
              <animate
                attributeName="opacity"
                values="0;1;1;1;0"
                keyTimes="0;0.02;0.15;0.85;1"
                dur="5s"
                repeatCount="indefinite"
              />
              <animateMotion
                dur="5s"
                repeatCount="indefinite"
                path="M 0,0 L 50,0 L 50,57 L 0,57 L 0,0"
              />
            </circle>
            <circle
              cx="-28"
              cy="-32"
              r="1.5"
              fill="#ffffff"
              opacity="0"
            >
              <animate
                attributeName="opacity"
                values="0;1;1;1;0"
                keyTimes="0;0.02;0.15;0.85;1"
                dur="5s"
                repeatCount="indefinite"
              />
              <animateMotion
                dur="5s"
                repeatCount="indefinite"
                path="M 0,0 L 50,0 L 50,57 L 0,57 L 0,0"
              />
            </circle>
            <circle
              cx="-28"
              cy="-32"
              r="5"
              fill="url(#packetGlow)"
              opacity="0"
            >
              <animate
                attributeName="opacity"
                values="0;0.3;0.3;0.3;0"
                keyTimes="0;0.02;0.15;0.85;1"
                dur="5s"
                repeatCount="indefinite"
              />
              <animateMotion
                dur="5s"
                repeatCount="indefinite"
                path="M 0,0 L 50,0 L 50,57 L 0,57 L 0,0"
              />
            </circle>
          </g>
        )}

        {/* Bottom-Left Circuit Node (White Core) */}
        <g transform="translate(-28, 25)">
          <circle
            cx="0"
            cy="0"
            r="5"
            fill="#10b981"
          />
          <circle
            cx="0"
            cy="0"
            r="2"
            fill="#ffffff"
          />
          {animate && (
            <circle
              cx="0"
              cy="0"
              r="5"
              fill="none"
              stroke="#84cc16"
              strokeWidth="1.5"
              opacity="0"
            >
              <animate
                attributeName="r"
                values="5;9;5"
                dur="5s"
                repeatCount="indefinite"
                begin="3.75s"
              />
              <animate
                attributeName="opacity"
                values="0;0.7;0"
                dur="5s"
                repeatCount="indefinite"
                begin="3.75s"
              />
            </circle>
          )}
        </g>

        {/* Top-Right Circuit Node (Gray Core) */}
        <g transform="translate(22, -32)">
          <circle
            cx="0"
            cy="0"
            r="5"
            fill="#6b7280"
          />
          <circle
            cx="0"
            cy="0"
            r="2"
            fill="#9ca3af"
          />
          {animate && (
            <circle
              cx="0"
              cy="0"
              r="5"
              fill="none"
              stroke="#84cc16"
              strokeWidth="1.5"
              opacity="0"
            >
              <animate
                attributeName="r"
                values="5;9;5"
                dur="5s"
                repeatCount="indefinite"
                begin="0.625s"
              />
              <animate
                attributeName="opacity"
                values="0;0.7;0"
                dur="5s"
                repeatCount="indefinite"
                begin="0.625s"
              />
            </circle>
          )}
        </g>

        {/* Top-Left Corner Pulse */}
        {animate && (
          <g transform="translate(-28, -32)">
            <circle
              cx="0"
              cy="0"
              r="2"
              fill="none"
              stroke="#84cc16"
              strokeWidth="1.5"
              opacity="0"
            >
              <animate
                attributeName="r"
                values="2;6;2"
                dur="5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0.7;0"
                dur="5s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* Bottom-Right Corner Pulse */}
        {animate && (
          <g transform="translate(22, 25)">
            <circle
              cx="0"
              cy="0"
              r="2"
              fill="none"
              stroke="#84cc16"
              strokeWidth="1.5"
              opacity="0"
            >
              <animate
                attributeName="r"
                values="2;6;2"
                dur="5s"
                repeatCount="indefinite"
                begin="2.5s"
              />
              <animate
                attributeName="opacity"
                values="0;0.7;0"
                dur="5s"
                repeatCount="indefinite"
                begin="2.5s"
              />
            </circle>
          </g>
        )}
      </g>
    </svg>
  );
}

export function PemabuLogoCompact({
  className = '',
  size = 32,
  animate = false
}: PemabuLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="compactGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>

      <g transform="translate(50, 50)">
        <path
          d="M 0,-30 L 26,-15 L 26,15 L 0,30 L -26,15 L -26,-15 Z"
          fill="none"
          stroke="url(#compactGradient)"
          strokeWidth="4"
        />

        <path
          d="M -10,-12 L -10,12 M -10,-12 Q 2,-15 2,-5 Q 2,3 -5,3"
          fill="none"
          stroke="url(#compactGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <g transform="translate(8, 0)">
          <circle cx="0" cy="-8" r="2.5" fill="url(#compactGradient)" />
          <circle cx="5" cy="0" r="2" fill="url(#compactGradient)" />
          <circle cx="0" cy="8" r="2.5" fill="url(#compactGradient)" />
        </g>
      </g>
    </svg>
  );
}
