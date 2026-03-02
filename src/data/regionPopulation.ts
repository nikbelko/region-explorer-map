// Simulated population data for UK ITL1 regions (approximate, in millions)
const REGION_POPULATION: Record<string, number> = {
  "North East": 2.65,
  "North West": 7.37,
  "Yorkshire and The Humber": 5.5,
  "East Midlands": 4.88,
  "West Midlands": 5.95,
  "East of England": 6.35,
  "London": 8.98,
  "South East": 9.22,
  "South West": 5.72,
  "Wales": 3.14,
  "Scotland": 5.45,
  "Northern Ireland": 1.9,
};

export function getRegionPopulation(regionName: string): number | null {
  if (REGION_POPULATION[regionName]) return REGION_POPULATION[regionName];
  
  const key = Object.keys(REGION_POPULATION).find((k) =>
    regionName.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(regionName.toLowerCase())
  );
  
  if (key) return REGION_POPULATION[key];
  
  // Generate a pseudo-random population between 1.5 and 6.0 for unknown regions
  let hash = 0;
  for (let i = 0; i < regionName.length; i++) {
    hash = regionName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.round((1.5 + Math.abs(hash % 45) / 10) * 100) / 100;
}

const REGION_AREA_KM2: Record<string, number> = {
  "North East": 8592,
  "North West": 14106,
  "Yorkshire and The Humber": 15408,
  "East Midlands": 15627,
  "West Midlands": 12998,
  "East of England": 19120,
  "London": 1572,
  "South East": 19095,
  "South West": 23829,
  "Wales": 20779,
  "Scotland": 77910,
  "Northern Ireland": 13562,
};

export function getRegionArea(regionName: string): number | null {
  if (REGION_AREA_KM2[regionName]) return REGION_AREA_KM2[regionName];
  const key = Object.keys(REGION_AREA_KM2).find((k) =>
    regionName.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(regionName.toLowerCase())
  );
  return key ? REGION_AREA_KM2[key] : null;
}
