import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { Brand, BRAND_CONFIGS, BRAND_COLOR_MAP, RegionStats, BrandStat } from "@/data/regions";

interface RegionMapProps {
  onRegionClick: (regionName: string) => void;
  selectedRegion: string | null;
  selectedBrands: Brand[];
  onRegionStats: (stats: RegionStats | null) => void;
}

const REGION_COLORS = [
  "hsl(185, 72%, 48%)", "hsl(340, 65%, 55%)", "hsl(45, 85%, 55%)",
  "hsl(130, 50%, 50%)", "hsl(270, 55%, 55%)", "hsl(20, 80%, 55%)",
  "hsl(200, 70%, 55%)", "hsl(160, 55%, 50%)", "hsl(300, 50%, 55%)",
  "hsl(60, 70%, 50%)", "hsl(0, 72%, 55%)", "hsl(210, 65%, 55%)",
];

// Store loaded restaurant data globally within component
interface RestaurantPoint {
  brand: Brand;
  lat: number;
  lng: number;
  name: string;
}

const RegionMap = ({ onRegionClick, selectedRegion, selectedBrands, onRegionStats }: RegionMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.GeoJSON | null>(null);
  const markerLayersRef = useRef<Record<string, L.LayerGroup>>({});
  const restaurantsRef = useRef<RestaurantPoint[]>([]);
  const regionsDataRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(0);

  const computeRegionStats = useCallback((regionName: string, brands: Brand[]) => {
    const regionsData = regionsDataRef.current;
    if (!regionsData) return null;

    // Find the region feature
    const regionFeature = regionsData.features?.find((f: any) => {
      const props = f?.properties || {};
      return (props.ITL125NM || `Region ${f?.id || "unknown"}`) === regionName;
    });
    if (!regionFeature) return null;

    // Count restaurants inside this region, filtered by selected brands
    const brandCounts: Record<string, number> = {};
    let total = 0;

    for (const r of restaurantsRef.current) {
      if (!brands.includes(r.brand)) continue;
      try {
        const pt = turfPoint([r.lng, r.lat]);
        if (booleanPointInPolygon(pt, regionFeature)) {
          brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;
          total++;
        }
      } catch {
        // skip invalid geometries
      }
    }

    const brandStats: BrandStat[] = Object.entries(brandCounts)
      .map(([brand, count]) => ({
        brand: brand as Brand,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        color: BRAND_COLOR_MAP[brand as Brand] || "#888",
      }))
      .sort((a, b) => b.count - a.count);

    return { regionName, totalPoints: total, brands: brandStats };
  }, []);

  // Load regions
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [52.5, -1.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    fetch("/data/uk-regions.geojson")
      .then((res) => res.json())
      .then((data) => {
        regionsDataRef.current = data;
        let colorIndex = 0;
        const geoLayer = L.geoJSON(data, {
          style: () => {
            const color = REGION_COLORS[colorIndex % REGION_COLORS.length];
            colorIndex++;
            return { color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.3 };
          },
          onEachFeature: (feature, layer) => {
            const props = feature?.properties || {};
            const name = props.ITL125NM || `Region ${feature?.id || "unknown"}`;
            (layer as any)._regionName = name;
            layer.bindTooltip(name, { sticky: true });
            layer.on("click", () => {
              onRegionClick(name);
            });
          },
        }).addTo(map);
        layersRef.current = geoLayer;
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load regions:", err);
        setLoading(false);
      });

    // Load restaurant brands
    let loaded = 0;
    setLoadingBrands(BRAND_CONFIGS.length);

    BRAND_CONFIGS.forEach((brand) => {
      const layerGroup = L.layerGroup().addTo(map);
      markerLayersRef.current[brand.name] = layerGroup;

      fetch(brand.file)
        .then((res) => res.json())
        .then((data) => {
          const features = data.features || [];
          features.forEach((f: any) => {
            const coords = f.geometry?.coordinates;
            if (!coords || coords.length < 2) return;
            const [lng, lat] = coords;
            if (typeof lat !== "number" || typeof lng !== "number") return;

            const name = f.properties?.name || "Unknown";
            restaurantsRef.current.push({ brand: brand.name, lat, lng, name });

            const marker = L.circleMarker([lat, lng], {
              radius: 4,
              fillColor: brand.color,
              color: brand.color,
              weight: 1,
              fillOpacity: 0.85,
            });
            marker.bindTooltip(
              `<strong style="color:${brand.color}">${brand.name}</strong><br/>${name}`,
              { direction: "top", offset: [0, -6], className: "brand-tooltip" }
            );
            marker.bindPopup(
              `<div style="font-family:sans-serif;font-size:12px">` +
              `<strong style="color:${brand.color}">${brand.name}</strong><br/>` +
              `<span>${name}</span></div>`
            );
            layerGroup.addLayer(marker);
          });
          loaded++;
          setLoadingBrands(BRAND_CONFIGS.length - loaded);
        })
        .catch((err) => {
          console.error(`Failed to load ${brand.name}:`, err);
          loaded++;
          setLoadingBrands(BRAND_CONFIGS.length - loaded);
        });
    });

    return () => {
      map.remove();
      mapInstance.current = null;
      markerLayersRef.current = {};
      restaurantsRef.current = [];
    };
  }, []);

  // Update region styles on selection + compute stats
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.eachLayer((layer: any) => {
      const isSelected = layer._regionName === selectedRegion;
      layer.setStyle({
        fillOpacity: isSelected ? 0.55 : 0.3,
        weight: isSelected ? 4 : 2,
        color: isSelected ? "#ffffff" : "#fff",
        dashArray: isSelected ? "" : "",
      });
      if (isSelected) {
        layer.bringToFront();
      }
    });

    if (selectedRegion) {
      const stats = computeRegionStats(selectedRegion, selectedBrands);
      onRegionStats(stats);
    } else {
      onRegionStats(null);
    }
  }, [selectedRegion, selectedBrands, computeRegionStats, onRegionStats]);

  // Toggle brand marker visibility
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    Object.entries(markerLayersRef.current).forEach(([brandName, layerGroup]) => {
      const isVisible = selectedBrands.includes(brandName as Brand);
      if (isVisible && !map.hasLayer(layerGroup)) {
        map.addLayer(layerGroup);
      } else if (!isVisible && map.hasLayer(layerGroup)) {
        map.removeLayer(layerGroup);
      }
    });
  }, [selectedBrands]);

  const isLoading = loading || loadingBrands > 0;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend - only show active brands */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Легенда</h4>
        <div className="space-y-1.5">
          {BRAND_CONFIGS.filter((b) => selectedBrands.includes(b.name)).map((b) => (
            <div key={b.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
              <span className="text-xs text-foreground/80">{b.name}</span>
            </div>
          ))}
          {selectedBrands.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">Нет активных брендов</p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">
              {loading ? "Загрузка регионов..." : `Загрузка брендов (${loadingBrands})...`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionMap;
