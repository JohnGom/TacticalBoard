import { Link } from "react-router-dom";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand${inverse ? " brand--inverse" : ""}`} to="/" aria-label="TacticalBoard, inicio">
      <img className="brand-mark" src="/tactical-board-mark.svg" alt="" />
      <span>TacticalBoard</span>
    </Link>
  );
}
