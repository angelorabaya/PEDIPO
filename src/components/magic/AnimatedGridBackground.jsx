import { useId } from "react";

/**
 * Magic UI – Grid Pattern Background
 * SVG grid with radial fade mask and floating gradient orbs.
 */
function AnimatedGridBackground({
  width = 40,
  height = 40,
  className = "",
}) {
  const id = useId();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Floating gradient orbs */}
      <div className="magic-gradient-orb magic-gradient-orb-a" />
      <div className="magic-gradient-orb magic-gradient-orb-b" />

      {/* SVG grid pattern */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`grid-${id}`}
            width={width}
            height={height}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${width} 0 L 0 0 0 ${height}`}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id={`fade-${id}`}>
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id={`mask-${id}`}>
            <rect
              width="100%"
              height="100%"
              fill={`url(#fade-${id})`}
            />
          </mask>
        </defs>

        {/* Static grid lines */}
        <rect
          width="100%"
          height="100%"
          fill={`url(#grid-${id})`}
          mask={`url(#mask-${id})`}
        />
      </svg>
    </div>
  );
}

export default AnimatedGridBackground;
