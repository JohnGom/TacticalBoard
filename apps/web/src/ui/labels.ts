import type { FootballTeamSummary } from "@tactical-board/contracts";

const spanishCountryNames: Readonly<Record<string, string>> = {
  spain: "España",
  germany: "Alemania",
  france: "Francia",
  italy: "Italia",
  england: "Inglaterra",
  netherlands: "Países Bajos",
  brazil: "Brasil",
  usa: "Estados Unidos",
  "united states": "Estados Unidos",
  mexico: "México",
  japan: "Japón",
  "south korea": "Corea del Sur",
  "north korea": "Corea del Norte",
  morocco: "Marruecos",
  belgium: "Bélgica",
  switzerland: "Suiza",
  sweden: "Suecia",
  denmark: "Dinamarca",
  wales: "Gales",
  scotland: "Escocia",
  "republic of ireland": "Irlanda",
  canada: "Canadá",
  cameroon: "Camerún",
  "ivory coast": "Costa de Marfil",
  peru: "Perú",
  turkey: "Turquía",
  ukraine: "Ucrania",
  czechia: "Chequia",
  "czech republic": "Chequia",
  hungary: "Hungría",
  egypt: "Egipto",
  tunisia: "Túnez",
  "saudi arabia": "Arabia Saudita",
  "new zealand": "Nueva Zelanda",
};

function normalizedCountryName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
}

export function footballCountryLabel(country: string | null): string {
  return country ? spanishCountryNames[normalizedCountryName(country)] ?? country : "País no disponible";
}

export function footballTeamNameLabel(team: FootballTeamSummary): string {
  if (team.kind !== "national") return team.name;
  return spanishCountryNames[normalizedCountryName(team.name)] ??
    (team.country ? footballCountryLabel(team.country) : team.name);
}

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
