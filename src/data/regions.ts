export const BRANDS = [
  "McDonald's",
  "KFC",
  "Subway",
  "Domino's",
  "Nando's",
  "Papa John's",
] as const;

export type Brand = typeof BRANDS[number];

export interface BrandConfig {
  name: Brand;
  color: string;
  file: string;
}

export const BRAND_CONFIGS: BrandConfig[] = [
  { name: "McDonald's", color: "#FFC72C", file: "/data/mcdonalds.geojson" },
  { name: "KFC", color: "#E4002B", file: "/data/kfc.geojson" },
  { name: "Subway", color: "#008C15", file: "/data/subway.geojson" },
  { name: "Domino's", color: "#0B439C", file: "/data/dominos.geojson" },
  { name: "Nando's", color: "#E35205", file: "/data/nandos.geojson" },
  { name: "Papa John's", color: "#CC0000", file: "/data/papajohns.geojson" },
];

export const BRAND_COLOR_MAP: Record<Brand, string> = Object.fromEntries(
  BRAND_CONFIGS.map((b) => [b.name, b.color])
) as Record<Brand, string>;
