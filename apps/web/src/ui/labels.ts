export function playerPositionLabel(position: string | null): string {
  if (!position) return "Sin posición";
  const normalized = position.toLowerCase();
  if (normalized.includes("goalkeeper") || normalized.includes("keeper") || normalized.includes("portero")) return "Portero";
  if (normalized.includes("defender") || normalized.includes("defensa") || normalized.includes("back")) return "Defensa";
  if (normalized.includes("midfielder") || normalized.includes("midfield") || normalized.includes("centrocampista")) return "Centrocampista";
  if (normalized.includes("forward") || normalized.includes("attacker") || normalized.includes("delantero") || normalized.includes("striker")) return "Delantero";
  return position;
}

export function teamKindLabel(kind: "custom" | "club" | "national" | "unknown"): string {
  if (kind === "custom") return "Equipo personalizado";
  if (kind === "national") return "Selección";
  if (kind === "club") return "Club";
  return "Equipo";
}
