import { FEATHER_PATHS } from "./featherPaths.js";

export default function Feather({ name, size = 24, label, className, ...rest }) {
  const parts = FEATHER_PATHS[name];
  if (!parts) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      {parts.map((part, i) => {
        if (part.path) return <path key={i} d={part.path} />;
        if (part.circle) {
          const [cx, cy, r] = part.circle;
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        const [x1, y1, x2, y2] = part.line;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </svg>
  );
}
