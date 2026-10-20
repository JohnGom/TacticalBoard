import { Link } from "react-router-dom";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand${inverse ? " brand--inverse" : ""}`} to="/" aria-label="TacticalBoard, inicio">
      <svg className="brand-mark" aria-hidden="true" viewBox="0 0 34 34" fill="none">
        <rect x="2" y="2" width="30" height="30" rx="9" fill="currentColor" />
        <path d="M8 8h18v18H8zM17 8v18M8 17h18" stroke="#163126" strokeWidth="1.1" opacity=".74" />
        <circle cx="17" cy="17" r="3.2" fill="#E8A453" stroke="#163126" strokeWidth=".8" />
      </svg>
      <span>TacticalBoard</span>
    </Link>
  );
}
