// Decorative watercolour-style cherry-blossom sprays, pinned to the four
// corners of the viewport — an SVG homage to the couple's wardrobe guide.
// Fixed, non-interactive, and hidden from assistive tech.

function Blossom({ x, y, r, rotate = 0, petal = "#EAB7BE", center = "#C9A24B" }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      {petals.map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy={-r * 0.62}
          rx={r * 0.42}
          ry={r * 0.62}
          fill={petal}
          transform={`rotate(${a})`}
        />
      ))}
      <circle cx="0" cy="0" r={r * 0.26} fill={center} />
    </g>
  );
}

function Spray() {
  // Authored for the top-left corner; the other three are mirrored via CSS.
  return (
    <svg
      viewBox="0 0 220 220"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
    >
      {/* stems */}
      <path
        d="M-10 60 Q60 70 120 130 M-10 110 Q50 120 90 175 M30 -10 Q60 50 60 110"
        stroke="#A3B18A"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* leaves */}
      <ellipse cx="78" cy="92" rx="15" ry="7" fill="#B6C29B" opacity="0.85" transform="rotate(35 78 92)" />
      <ellipse cx="46" cy="140" rx="13" ry="6" fill="#A3B18A" opacity="0.8" transform="rotate(60 46 140)" />
      <ellipse cx="120" cy="60" rx="14" ry="6.5" fill="#C7CFB8" opacity="0.85" transform="rotate(20 120 60)" />

      {/* blossoms, largest near the corner */}
      <Blossom x={34} y={34} r={30} rotate={10} petal="#E7A9B2" />
      <Blossom x={96} y={70} r={22} rotate={-15} petal="#F0CBD0" />
      <Blossom x={64} y={118} r={18} rotate={25} petal="#EAB7BE" />
      <Blossom x={132} y={120} r={14} rotate={0} petal="#F4D9DD" />
      <Blossom x={150} y={48} r={11} rotate={40} petal="#E7A9B2" />

      {/* a few buds */}
      <circle cx="108" cy="150" r="5" fill="#D99CA6" opacity="0.8" />
      <circle cx="20" cy="92" r="4" fill="#E7A9B2" opacity="0.8" />
    </svg>
  );
}

const CORNERS = [
  { key: "tl", pos: "top-0 left-0", flip: "scale(1,1)" },
  { key: "tr", pos: "top-0 right-0", flip: "scale(-1,1)" },
  { key: "bl", pos: "bottom-0 left-0", flip: "scale(1,-1)" },
  { key: "br", pos: "bottom-0 right-0", flip: "scale(-1,-1)" },
];

export default function FloralCorners() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {CORNERS.map(({ key, pos, flip }) => (
        <div
          key={key}
          className={`absolute ${pos} w-36 h-36 sm:w-44 sm:h-44 opacity-90`}
          style={{ transform: flip }}
        >
          <Spray />
        </div>
      ))}
    </div>
  );
}
