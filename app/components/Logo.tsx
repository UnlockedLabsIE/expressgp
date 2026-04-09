// ExpressGP brand mark — pure SVG, no external assets.
//
// Layout (viewBox 0 0 340 80):
//   icon area: x 0..90  — speed lines + two-tone medical cross
//   wordmark : x 100..  — "EXPRESS" (blue) + " GP" (green)
//
// Coordinate notes for the cross (centred at 60,40, arm width 20):
//   vertical bar  : x 50..70, y 15..65
//   horizontal bar: x 35..85, y 30..50
// Bottom-right quadrant overlay (green) covers everything where
//   x >= 60 AND y >= 40, intersected with the cross.

export default function Logo({
  height = 44,
  className,
  style,
}: {
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const viewBoxWidth = 340;
  const viewBoxHeight = 80;
  const width = (viewBoxWidth / viewBoxHeight) * height;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label="ExpressGP"
    >
      {/* Speed lines — three horizontal bars, each shorter than the last,
          stacked vertically to the left of the cross. */}
      <rect x="2" y="31" width="28" height="3" rx="1.5" fill="#2F6FB6" />
      <rect x="10" y="38" width="20" height="3" rx="1.5" fill="#2F6FB6" />
      <rect x="18" y="45" width="12" height="3" rx="1.5" fill="#2F6FB6" />

      {/* Full cross — primary blue base. */}
      <path
        d="M 50 15 H 70 V 30 H 85 V 50 H 70 V 65 H 50 V 50 H 35 V 30 H 50 Z"
        fill="#2F6FB6"
      />

      {/* Bottom-right quadrant overlay — primary green. */}
      <path d="M 60 40 H 85 V 50 H 70 V 65 H 60 Z" fill="#2FB36F" />

      {/* Wordmark. y=54 places the cap-height text vertically centred
          around the cross's midline (y=40) at this font size. */}
      <text
        x="100"
        y="54"
        fontFamily="Inter, Arial, Helvetica, sans-serif"
        fontSize="34"
        fontWeight="700"
        letterSpacing="1"
        fill="#2F6FB6"
      >
        EXPRESS
      </text>
      <text
        x="272"
        y="54"
        fontFamily="Inter, Arial, Helvetica, sans-serif"
        fontSize="34"
        fontWeight="700"
        letterSpacing="1"
        fill="#2FB36F"
      >
        GP
      </text>
    </svg>
  );
}
