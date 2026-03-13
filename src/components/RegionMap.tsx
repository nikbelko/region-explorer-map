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
  flyToRegion?: string | null;
  /** Width in px of the right region panel (so flyTo can offset padding) */
  regionPanelWidth?: number;
}

const REGION_COLORS = [
  "hsl(185, 72%, 48%)", "hsl(340, 65%, 55%)", "hsl(45, 85%, 55%)",
  "hsl(130, 50%, 50%)", "hsl(270, 55%, 55%)", "hsl(20, 80%, 55%)",
  "hsl(200, 70%, 55%)", "hsl(160, 55%, 50%)", "hsl(300, 50%, 55%)",
  "hsl(60, 70%, 50%)", "hsl(0, 72%, 55%)", "hsl(210, 65%, 55%)",
];

interface RestaurantPoint { brand: Brand; lat: number; lng: number; name: string; }

const RegionMap = ({
  onRegionClick, selectedRegion, selectedBrands, onRegionStats,
  flyToRegion, regionPanelWidth = 0,
}: RegionMapProps) => {
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
        if (booleanPointInPolygon(turfPoint([r.lng, r.lat]), regionFeature)) {
          brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;
          total++;
        }
      } catch { /**/ }
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

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { center: [52.5, -1.5], zoom: 6, zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    mapInstance.current = map;

    // Light hover tooltip
    const tooltipDiv = document.createElement("div");
    tooltipDiv.style.cssText =
      "display:none;position:absolute;z-index:900;pointer-events:none;" +
      "background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;" +
      "font-size:11px;color:#1f2937;box-shadow:0 4px 12px rgba(0,0,0,0.10);max-width:220px;";

    fetch("/data/uk-regions.geojson").then((res) => res.json()).then((data) => {
      regionsDataRef.current = data;
      map.getContainer().appendChild(tooltipDiv);
      (map as any)._regionTooltipDiv = tooltipDiv;

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
          layer.on("click", () => { onRegionClick(name); });
          layer.on("mouseover", () => {
            if (selectedRegionRef.current === name) return;
            const stats = computeRegionStats(name, selectedBrandsRef.current);
            const total = stats?.totalPoints ?? 0;
            const top2 = stats?.brands.slice(0, 2) ?? [];
            const top2Html = top2.map(
              (b) => `<div style="display:flex;align-items:center;gap:4px;margin-top:2px;"><span style="width:6px;height:6px;border-radius:2px;background:${b.color};display:inline-block;"></span><span>${b.brand}</span><span style="margin-left:auto;font-weight:600;">${b.count}</span></div>`
            ).join("");
            const pop = getRegionPopulation(name);
            const area = getRegionArea(name);
            const density = pop && area ? Math.round((pop * 1_000_000) / area) : null;
            tooltipDiv.innerHTML =
              `<div style="font-weight:700;margin-bottom:3px;color:#111827;">${name}</div>` +
              `<div style="color:#6b7280;">Locations: <span style="color:#111827;font-weight:600;">${total}</span></div>` +
              (pop ? `<div style="color:#6b7280;">Population: <span style="color:#111827;font-weight:600;">${pop}M</span></div>` : "") +
              (area ? `<div style="color:#6b7280;">Area: <span style="color:#111827;font-weight:600;">${area.toLocaleString()} km²</span></div>` : "") +
              (density ? `<div style="color:#6b7280;">Density: <span style="color:#111827;font-weight:600;">${density.toLocaleString()} /km²</span></div>` : "") +
              (top2Html ? `<div style="margin-top:3px;border-top:1px solid #f3f4f6;padding-top:3px;">${top2Html}</div>` : "");
            tooltipDiv.style.display = "block";
          });
          layer.on("mousemove", (e: any) => {
            if (selectedRegionRef.current === name) return;
            const p = map.latLngToContainerPoint(e.latlng);
            tooltipDiv.style.left = (p.x + 12) + "px";
            tooltipDiv.style.top = (p.y - 10) + "px";
          });
          layer.on("mouseout", () => { tooltipDiv.style.display = "none"; });
        },
      }).addTo(map);
      layersRef.current = geoLayer;
      setLoading(false);
    }).catch(() => { setLoading(false); });

    let loaded = 0;
    setLoadingBrands(BRAND_CONFIGS.length);
    BRAND_CONFIGS.forEach((brand) => {
      const layerGroup = L.layerGroup().addTo(map);
      markerLayersRef.current[brand.name] = layerGroup;
      fetch(brand.file).then((res) => res.json()).then((data) => {
        (data.features || []).forEach((f: any) => {
          const coords = f.geometry?.coordinates;
          if (!coords || coords.length < 2) return;
          const [lng, lat] = coords;
          if (typeof lat !== "number" || typeof lng !== "number") return;
          const name = f.properties?.name || "Unknown";
          restaurantsRef.current.push({ brand: brand.name, lat, lng, name });
          const marker = L.circleMarker([lat, lng], { radius: 4, fillColor: brand.color, color: brand.color, weight: 1, fillOpacity: 0.85 });
          marker.bindTooltip(`<strong style="color:${brand.color}">${brand.name}</strong><br/>${name}`, { direction: "top", offset: [0, -6], className: "brand-tooltip" });
          layerGroup.addLayer(marker);
        });
        loaded++;
        setLoadingBrands(BRAND_CONFIGS.length - loaded);
      }).catch(() => { loaded++; setLoadingBrands(BRAND_CONFIGS.length - loaded); });
    });

    return () => {
      map.remove();
      mapInstance.current = null;
      markerLayersRef.current = {};
      restaurantsRef.current = [];
    };
  }, []);

  // Style selected region + compute stats
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.eachLayer((layer: any) => {
      const isSelected = layer._regionName === selectedRegion;
      layer.setStyle({ fillOpacity: isSelected ? 0.55 : 0.3, weight: isSelected ? 4 : 2, color: "#fff" });
      if (isSelected) layer.bringToFront();
    });
    if (selectedRegion) onRegionStats(computeRegionStats(selectedRegion, selectedBrands));
    else onRegionStats(null);
  }, [selectedRegion, selectedBrands, computeRegionStats, onRegionStats]);

  // Fly to region — offset right padding for the region info panel
  useEffect(() => {
    if (!flyToRegion || !layersRef.current || !mapInstance.current) return;
    layersRef.current.eachLayer((layer: any) => {
      if (layer._regionName === flyToRegion && typeof layer.getBounds === "function") {
        try {
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            // paddingTopLeft = [leftPad, topPad], paddingBottomRight = [rightPad+panel, bottomPad]
            mapInstance.current!.flyToBounds(bounds, {
              paddingTopLeft: [40, 40],
              paddingBottomRight: [40 + regionPanelWidth, 40],
              maxZoom: 9,
              duration: 0.8,
            });
          }
        } catch { /**/ }
      }
    });
  }, [flyToRegion, regionPanelWidth]);

  // Toggle brands
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    Object.entries(markerLayersRef.current).forEach(([brandName, lg]) => {
      const v = selectedBrands.includes(brandName as Brand);
      if (v && !map.hasLayer(lg)) map.addLayer(lg);
      else if (!v && map.hasLayer(lg)) map.removeLayer(lg);
    });
  }, [selectedBrands]);

  const isLoading = loading || loadingBrands > 0;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Brands</h4>
        <div className="space-y-1.5">
          {BRAND_CONFIGS.filter((b) => selectedBrands.includes(b.name)).map((b) => (
            <div key={b.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
              <span className="text-xs text-gray-700">{b.name}</span>
            </div>
          ))}
          {selectedBrands.length === 0 && <p className="text-[10px] text-gray-400 italic">No active brands</p>}
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-[1000]">
          <div className="flex items-center gap-3">
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
