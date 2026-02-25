export interface RegionProperties {
  name: string;
  id: string;
  color: string;
}

export interface RegionFeature {
  type: "Feature";
  properties: RegionProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface RegionsGeoJSON {
  type: "FeatureCollection";
  features: RegionFeature[];
}

export const regionsData: RegionsGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "London", id: "london", color: "hsl(185, 72%, 48%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-0.51, 51.28], [-0.51, 51.69], [0.33, 51.69], [0.33, 51.28], [-0.51, 51.28]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "South East", id: "south-east", color: "hsl(340, 65%, 55%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-1.85, 50.7], [-1.85, 51.28], [-0.51, 51.28], [-0.51, 51.69],
          [0.33, 51.69], [1.45, 51.38], [1.45, 50.75], [-1.85, 50.7]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "South West", id: "south-west", color: "hsl(45, 85%, 55%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-5.72, 49.95], [-5.72, 51.65], [-1.85, 51.65], [-1.85, 50.7], [-5.72, 49.95]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "East of England", id: "east", color: "hsl(130, 50%, 50%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-0.51, 51.69], [0.33, 51.69], [1.76, 52.0], [1.76, 52.65],
          [0.0, 52.65], [-0.51, 52.1], [-0.51, 51.69]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "West Midlands", id: "west-midlands", color: "hsl(270, 55%, 55%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-3.15, 52.0], [-3.15, 52.85], [-1.5, 52.85], [-1.5, 52.0], [-3.15, 52.0]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "East Midlands", id: "east-midlands", color: "hsl(20, 80%, 55%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-1.5, 52.0], [-1.5, 53.1], [0.0, 53.1], [0.0, 52.65],
          [-0.51, 52.1], [-1.5, 52.0]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Yorkshire and the Humber", id: "yorkshire", color: "hsl(200, 70%, 55%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-2.2, 53.1], [-2.2, 53.95], [-0.08, 53.95], [-0.08, 53.5],
          [0.0, 53.1], [-2.2, 53.1]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "North West", id: "north-west", color: "hsl(160, 55%, 50%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-3.1, 53.0], [-3.1, 54.5], [-2.2, 54.5], [-2.2, 53.1],
          [-3.1, 53.0]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "North East", id: "north-east", color: "hsl(300, 50%, 55%)" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-2.2, 53.95], [-2.2, 55.81], [-1.55, 55.81], [-1.55, 54.5],
          [-0.08, 53.95], [-2.2, 53.95]
        ]]
      }
    }
  ]
};

export const BRANDS = [
  "McDonald's",
  "KFC",
  "Burger King",
  "Subway",
  "Starbucks",
  "Dominos",
  "Pizza Hut",
] as const;

export type Brand = typeof BRANDS[number];
