import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { Brand, BRAND_CONFIGS, BRAND_COLOR_MAP, RegionStats, BrandStat } from "@/data/regions";
import { getRegionPopulation, getRegionArea } from "@/data/regionPopulation";

interface RegionMapProps {
  onRegionClick: (regionName: string) => void;
  selectedRegion: string | null;
  selectedBrands: Brand[];
  onRegionStats: (stats: RegionStats | null) => void;
}

const REGION_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981",
  "#8b5cf6", "#f97316", "#06b6d4", "#84cc16",
  "#ec4899", "#14b8a6", "#6366f1", "#a3e635",
];

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
  const selectedBrandsRef = useRef<Brand[]>(selectedBrands);
  const selectedRegionRef = useRef<string | null>(selectedRegion);
  const [loading, setLoading] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(0);

  selectedBrandsRef.current = selectedBrands;
  selectedRegionRef.current = selectedRegion;

  const computeRegionStats = useCallback((regionName: string, brands: Brand[]) => {
    const regionsData = regionsDataRef.current;
    if (!regionsData) return null;

    const regionFeature = regionsData.features?.find((f: any) => {
      const props = f?.properties || {};
      return (props.ITL125NM || `Region ${f?.id || "unknown"}`) === regionName;
    });
    if (!regionFeature) return null;

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
        // skip
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

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [52.5, -1.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    // Light map tiles — Getplace style
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    fetch("/data/uk-regions.geojson")
      .then((res) => res.json())
      .then((data) => {
        regionsDataRef.current = data;

        // Light hover tooltip
        const tooltipDiv = document.createElement("div");
        tooltipDiv.className = "region-hover-tooltip";
        tooltipDiv.style.cssText =
          "display:none;position:absolute;z-index:900;pointer-events:none;" +
          "background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;" +
          "padding:8px 12px;font-size:11px;color:#111827;" +
          "box-shadow:0 2px 10px rgba(0,0,0,0.12);max-width:220px;" +
          "font-family:'Inter',-apple-system,sans-serif;";
        map.getContainer().appendChild(tooltipDiv);
        (map as any)._regionTooltipDiv = tooltipDiv;

        let colorIndex = 0;
        const geoLayer = L.geoJSON(data, {
          style: () => {
            const color = REGION_COLORS[colorIndex % REGION_COLORS.length];
            colorIndex++;
            return { color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 0.45 };
          },
          onEachFeature: (feature, layer) => {
            const props = feature?.properties || {};
            const name = props.ITL125NM || `Region ${feature?.id || "unknown"}`;
            (layer as any)._regionName = name;

            layer.on("click", () => onRegionClick(name));

            layer.on("mouseover", () => {
              if (selectedRegionRef.current === name) return;
              const stats = computeRegionStats(name, selectedBrandsRef.current);
              const total = stats?.totalPoints ?? 0;
              const top2 = stats?.brands.slice(0, 2) ?? [];

              const top2Html = top2.map(
                (b) => `<div style="display:flex;align-items:center;gap:5px;margin-top:3px;">` +
                  `<span style="width:6px;height:6px;border-radius:50%;background:${b.color};display:inline-block;flex-shrink:0;"></span>` +
                  `<span style="color:#374151;flex:1;">${b.brand}</span>` +
                  `<span style="font-weight:600;color:#111827;">${b.count}</span>` +
                  `</div>`
              ).join("");

              const pop = getRegionPopulation(name);
              const area = getRegionArea(name);
              const popDensity = pop && area ? Math.round((pop * 1_000_000) / area) : null;

              const metaHtml = [
                pop    ? `<div style="color:#6b7280;margin-top:2px;">Population: <span style="color:#111827;font-weight:600;">${pop}M</span></div>` : "",
                area   ? `<div style="color:#6b7280;">Area: <span style="color:#111827;font-weight:600;">${area.toLocaleString()} km²</span></div>` : "",
                popDensity ? `<div style="color:#6b7280;">Density: <span style="color:#111827;font-weight:600;">${popDensity.toLocaleString()} / km²</span></div>` : "",
              ].join("");

              tooltipDiv.innerHTML =
                `<div style="font-weight:700;font-size:12px;color:#111827;margin-bottom:4px;">${name}</div>` +
                `<div style="color:#6b7280;">Locations: <span style="color:#111827;font-weight:600;">${total}</span></div>` +
                metaHtml +
                (top2Html ? `<div style="margin-top:5px;padding-top:5px;border-top:1px solid #f3f4f6;">${top2Html}</div>` : "");

              tooltipDiv.style.display = "block";
            });

            layer.on("mousemove", (e: any) => {
              if (selectedRegionRef.current === name) return;
              const containerPoint = map.latLngToContainerPoint(e.latlng);
              tooltipDiv.style.left = (containerPoint.x + 14) + "px";
              tooltipDiv.style.top = (containerPoint.y - 10) + "px";
            });

            layer.on("mouseout", () => {
              tooltipDiv.style.display = "none";
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
              color: "#ffffff",
              weight: 1,
              fillOpacity: 0.9,
            });
            marker.bindTooltip(
              `<strong style="color:${brand.color}">${brand.name}</strong><br/>${name}`,
              { direction: "top", offset: [0, -6], className: "brand-tooltip" }
            );
            layerGroup.addLayer(marker);
          });
          loaded++;
          setLoadingBrands(BRAND_CONFIGS.length - loaded);
        })
        .catch(() => {
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
        fillOpacity: isSelected ? 0.65 : 0.45,
        weight: isSelected ? 3 : 2,
        color: isSelected ? "#1d4ed8" : "#ffffff",
      });
      if (isSelected) layer.bringToFront();
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
      if (isVisible && !map.hasLayer(layerGroup)) map.addLayer(layerGroup);
      else if (!isVisible && map.hasLayer(layerGroup)) map.removeLayer(layerGroup);
    });
  }, [selectedBrands]);

  const isLoading = loading || loadingBrands > 0;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-5 right-5 z-[1000] bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Chains</h4>
        <div className="space-y-1.5">
          {BRAND_CONFIGS.filter((b) => selectedBrands.includes(b.name)).map((b) => (
            <div key={b.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-xs text-gray-600">{b.name}</span>
            </div>
          ))}
          {selectedBrands.length === 0 && (
            <p className="text-[10px] text-gray-400 italic">No active chains</p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-[1000]">
          <div className="flex items-center gap-3 text-blue-600">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-600">
              {loading ? "Loading regions..." : `Loading brands (${loadingBrands})...`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionMap;
