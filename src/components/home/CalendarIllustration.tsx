import React from 'react';

export const CalendarIllustration: React.FC = () => {
  return (
    <div className="relative w-56 h-48 mx-auto my-2 flex items-center justify-center select-none">
      {/* Background Soft Purple Glow */}
      <div className="absolute inset-0 bg-brand-purple/20 blur-2xl rounded-full transform scale-90" />
      <div className="absolute bottom-4 w-44 h-8 bg-black/40 blur-md rounded-full" />

      {/* SVG Illustration matching the reference */}
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xl"
      >
        <defs>
          <linearGradient id="calBg" x1="20" y1="30" x2="190" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E2E8F0" />
            <stop offset="0.6" stopColor="#C7D2FE" />
            <stop offset="1" stopColor="#A5B4FC" />
          </linearGradient>
          <linearGradient id="calHeader" x1="20" y1="20" x2="190" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818CF8" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="clockGrad" x1="120" y1="80" x2="200" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="0.7" stopColor="#EEF2FF" />
            <stop offset="1" stopColor="#C7D2FE" />
          </linearGradient>
          <linearGradient id="clockRing" x1="120" y1="80" x2="200" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B43EF" />
            <stop offset="1" stopColor="#6435CC" />
          </linearGradient>
          <linearGradient id="ringPeg" x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A5B4FC" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Calendar Body Base */}
        <g transform="rotate(-4 110 100)">
          {/* Calendar Shadow */}
          <rect x="34" y="38" width="148" height="118" rx="20" fill="#181830" opacity="0.6" />

          {/* Calendar Main Card */}
          <rect x="30" y="32" width="148" height="118" rx="20" fill="url(#calBg)" />

          {/* Top Binding Pegs */}
          <rect x="62" y="20" width="12" height="24" rx="6" fill="url(#ringPeg)" />
          <rect x="134" y="20" width="12" height="24" rx="6" fill="url(#ringPeg)" />

          {/* Calendar Grid Cells */}
          {/* Row 1 */}
          <rect x="50" y="60" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />
          <rect x="76" y="60" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />
          <rect x="102" y="60" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />
          <rect x="128" y="60" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />

          {/* Row 2 */}
          <rect x="50" y="82" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.4" />
          <rect x="76" y="82" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.85" />
          <rect x="102" y="82" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />
          <rect x="128" y="82" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />

          {/* Row 3 */}
          <rect x="50" y="104" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />
          <rect x="76" y="104" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />
          <rect x="102" y="104" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.3" />
          <rect x="128" y="104" width="18" height="14" rx="4" fill="#8B43EF" opacity="0.2" />

          {/* Row 4 */}
          <rect x="50" y="126" width="18" height="12" rx="3" fill="#8B43EF" opacity="0.25" />
          <rect x="76" y="126" width="18" height="12" rx="3" fill="#8B43EF" opacity="0.25" />
          <rect x="102" y="126" width="18" height="12" rx="3" fill="#8B43EF" opacity="0.2" />
        </g>

        {/* Floating 3D Clock in Front Right */}
        <g transform="translate(138, 96)">
          {/* Clock Outer Ring with Purple Border */}
          <circle cx="34" cy="34" r="34" fill="url(#clockRing)" />
          <circle cx="34" cy="34" r="30" fill="url(#clockGrad)" />

          {/* Clock Center Pin */}
          <circle cx="34" cy="34" r="3.5" fill="#6435CC" />

          {/* Clock Hands pointing at 10:10 */}
          {/* Hour hand */}
          <line
            x1="34"
            y1="34"
            x2="24"
            y2="22"
            stroke="#6435CC"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Minute hand */}
          <line
            x1="34"
            y1="34"
            x2="48"
            y2="20"
            stroke="#8B43EF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Sparkling Stars */}
        {/* Top-right sparkle */}
        <g transform="translate(202, 38)" filter="url(#glow)">
          <path
            d="M8 0L9.8 5.6L16 8L9.8 10.4L8 16L6.2 10.4L0 8L6.2 5.6L8 0Z"
            fill="#BD78FF"
          />
        </g>
        {/* Left sparkle */}
        <g transform="translate(18, 70)" filter="url(#glow)">
          <path
            d="M6 0L7.3 4.2L12 6L7.3 7.8L6 12L4.7 7.8L0 6L4.7 4.2L6 0Z"
            fill="#FFFFFF"
          />
        </g>
        {/* Bottom sparkle */}
        <g transform="translate(42, 160)" filter="url(#glow)">
          <path
            d="M5 0L6 3.5L10 5L6 6.5L5 10L4 6.5L0 5L4 3.5L5 0Z"
            fill="#BD78FF"
          />
        </g>
      </svg>
    </div>
  );
};

