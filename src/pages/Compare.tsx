import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb } from "lucide-react";
import L from "leaflet";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { Brand, BRANDS, BRAND_CONFIGS } from "@/data/regions";
import { useRestaurantData, RestaurantPoint } from "@/hooks/useRestaurantData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BRAND_A_COLOR = "#3B82F6";
const BRAND_B_COLOR = "#F97316";

const REGION_COLORS = [
  "hsl(185, 72%, 48%)", "hsl(340, 65%, 55%)", "hsl(45, 85%, 55%)",
  "hsl(130, 50%, 50%)", "hsl(270, 55%, 55%)", "hsl(20, 80%, 55%)",
  "hsl(200, 70%, 55%)", "hsl(160, 55%, 50%)", "hsl(300, 50%, 55%)",
  "hsl(60, 70%, 50%)", "hsl(0, 72%, 55%)", "hsl(210, 65%, 55%)",
];

interface RegionComparison {
  region: string;
  countA: number;
  countB: number;
  leader: "A" | "B" | "tie";
}

const Compare = () => {
  const navigate = useNavigate();
  const { restaurants, loading: dataLoading } = useRestaurantData();
  const [brandA, setBrandA] = useState<Brand>("McDonald's");
  const [brandB, setBrandB] = useState<Brand>("KFC");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionsData, setRegionsData] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.GeoJSON | null>(null);
  const markerLayerA = useRef<L.LayerGroup | null>(null);
  const markerLayerB = useRef<L.LayerGroup | null>(null);

  // Load map and regions
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
    markerLayerA.current = L.layerGroup().addTo(map);
    markerLayerB.current = L.layerGroup().addTo(map);

    fetch("/data/uk-regions.geojson")
      .then((res) => res.json())
      .then((data) => {
        setRegionsData(data);
        let colorIndex = 0;
        const geoLayer = L.geoJSON(data, {
          style: () => {
            const color = REGION_COLORS[colorIndex % REGION_COLORS.length];
            colorIndex++;
            return { color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.3 };
          },
          onEachFeature: (feature, layer) => {
            const name = feature?.properties?.ITL125NM || `Region ${feature?.id || "unknown"}`;
            (layer as any)._regionName = name;
            layer.on("click", () => setSelectedRegion(name));
          },
        }).addTo(map);
        layersRef.current = geoLayer;
        setMapLoading(false);
      })
      .catch(() => setMapLoading(false));

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when brands or data change
  useEffect(() => {
    if (!markerLayerA.current || !markerLayerB.current) return;
    markerLayerA.current.clearLayers();
    markerLayerB.current.clearLayers();

    restaurants.forEach((r) => {
      if (r.brand === brandA) {
        const m = L.circleMarker([r.lat, r.lng], {
          radius: 5, fillColor: BRAND_A_COLOR, color: BRAND_A_COLOR, weight: 1, fillOpacity: 0.85,
        });
        m.bindTooltip(`<strong style="color:${BRAND_A_COLOR}">${r.brand}</strong><br/>${r.name}`, { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerA.current!.addLayer(m);
      } else if (r.brand === brandB) {
        const m = L.circleMarker([r.lat, r.lng], {
          radius: 5, fillColor: BRAND_B_COLOR, color: BRAND_B_COLOR, weight: 1, fillOpacity: 0.85,
        });
        m.bindTooltip(`<strong style="color:${BRAND_B_COLOR}">${r.brand}</strong><br/>${r.name}`, { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerB.current!.addLayer(m);
      }
    });
  }, [brandA, brandB, restaurants]);

  // Highlight selected region
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.eachLayer((layer: any) => {
      const isSelected = layer._regionName === selectedRegion;
      layer.setStyle({
        fillOpacity: isSelected ? 0.55 : 0.3,
        weight: isSelected ? 4 : 2,
      });
      if (isSelected) layer.bringToFront();
    });
  }, [selectedRegion]);

  // Compute comparison data
  const comparisons = useMemo<RegionComparison[]>(() => {
    if (!regionsData || restaurants.length === 0) return [];

    const features = regionsData.features || [];
    const results: RegionComparison[] = [];

    for (const feature of features) {
      const name = feature?.properties?.ITL125NM || `Region ${feature?.id || "unknown"}`;
      let countA = 0;
      let countB = 0;

      for (const r of restaurants) {
        if (r.brand !== brandA && r.brand !== brandB) continue;
        try {
          const pt = turfPoint([r.lng, r.lat]);
          if (booleanPointInPolygon(pt, feature)) {
            if (r.brand === brandA) countA++;
            else countB++;
          }
        } catch { /* skip */ }
      }

      results.push({
        region: name,
        countA,
        countB,
        leader: countA > countB ? "A" : countB > countA ? "B" : "tie",
      });
    }

    return results.sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));
  }, [regionsData, restaurants, brandA, brandB]);

  const totalA = comparisons.reduce((s, c) => s + c.countA, 0);
  const totalB = comparisons.reduce((s, c) => s + c.countB, 0);
  const overallLeader = totalA > totalB ? "A" : totalB > totalA ? "B" : "tie";

  // Insights
  const insights = useMemo(() => {
    if (comparisons.length === 0) return [];
    const result: string[] = [];

    const aWins = comparisons.filter((c) => c.leader === "A").length;
    result.push(`${brandA} лидирует в ${aWins} из ${comparisons.length} регионов`);

    const bWinRegions = comparisons.filter((c) => c.leader === "B").map((c) => c.region);
    if (bWinRegions.length > 0) {
      const shown = bWinRegions.slice(0, 3).join(", ");
      const suffix = bWinRegions.length > 3 ? ` и ещё ${bWinRegions.length - 3}` : "";
      result.push(`${brandB} лидирует в: ${shown}${suffix}`);
    } else {
      result.push(`${brandB} не лидирует ни в одном регионе`);
    }

    let maxGap = 0;
    let maxGapRegion = "";
    let maxGapWinner = "";
    for (const c of comparisons) {
      const gap = Math.abs(c.countA - c.countB);
      if (gap > maxGap) {
        maxGap = gap;
        maxGapRegion = c.region;
        maxGapWinner = c.countA > c.countB ? brandA : brandB;
      }
    }
    if (maxGap > 0) {
      result.push(`Макс. разрыв: ${maxGapWinner} лидирует на ${maxGap} точек в ${maxGapRegion}`);
    }

    return result;
  }, [comparisons, brandA, brandB]);

  const isLoading = dataLoading || mapLoading;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-[30%] min-w-[280px] border-r border-border bg-card flex flex-col">
        <header className="px-5 py-4 border-b border-border">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Country Explorer
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Getplace
            </span>
          </div>
          <h1 className="text-lg font-bold text-foreground">Brand Comparison</h1>
          <p className="text-xs text-muted-foreground">England • Head-to-head</p>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Brand selectors */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_A_COLOR }} />
                Brand A
              </label>
              <select
                value={brandA}
                onChange={(e) => setBrandA(e.target.value as Brand)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_B_COLOR }} />
                Brand B
              </label>
              <select
                value={brandB}
                onChange={(e) => setBrandB(e.target.value as Brand)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_A_COLOR }} />
                Brand A
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_B_COLOR }} />
                Brand B
              </span>
            </div>
          </div>

          {/* Comparison table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40">
                  <TableHead className="text-[10px] h-8 px-2">Region</TableHead>
                  <TableHead className="text-[10px] h-8 px-2 text-right" style={{ color: BRAND_A_COLOR }}>A</TableHead>
                  <TableHead className="text-[10px] h-8 px-2 text-right" style={{ color: BRAND_B_COLOR }}>B</TableHead>
                  <TableHead className="text-[10px] h-8 px-2">Leader</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((c) => (
                  <TableRow
                    key={c.region}
                    className={`border-b border-border/40 cursor-pointer ${selectedRegion === c.region ? "bg-secondary" : ""}`}
                    onClick={() => setSelectedRegion(c.region)}
                  >
                    <TableCell className="text-xs py-1.5 px-2">{c.region}</TableCell>
                    <TableCell className="text-xs py-1.5 px-2 text-right font-medium">{c.countA}</TableCell>
                    <TableCell className="text-xs py-1.5 px-2 text-right font-medium">{c.countB}</TableCell>
                    <TableCell className="text-xs py-1.5 px-2">
                      {c.leader === "tie" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span style={{ color: c.leader === "A" ? BRAND_A_COLOR : BRAND_B_COLOR }}>
                          {c.leader === "A" ? brandA : brandB}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {comparisons.length > 0 && (
                  <TableRow className="border-t border-border font-semibold">
                    <TableCell className="text-xs py-1.5 px-2">Total</TableCell>
                    <TableCell className="text-xs py-1.5 px-2 text-right">{totalA}</TableCell>
                    <TableCell className="text-xs py-1.5 px-2 text-right">{totalB}</TableCell>
                    <TableCell className="text-xs py-1.5 px-2">
                      {overallLeader === "tie" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span style={{ color: overallLeader === "A" ? BRAND_A_COLOR : BRAND_B_COLOR }}>
                          {overallLeader === "A" ? brandA : brandB}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Legend */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Легенда</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: BRAND_A_COLOR }} />
              <span className="text-xs text-foreground/80">{brandA}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: BRAND_B_COLOR }} />
              <span className="text-xs text-foreground/80">{brandB}</span>
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="absolute bottom-6 left-6 right-64 z-[1000] bg-card/80 backdrop-blur-md border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Инсайты
              </h4>
            </div>
            <div className="space-y-1">
              {insights.map((text, i) => (
                <p key={i} className="text-xs text-foreground/80">• {text}</p>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
            <div className="flex items-center gap-3 text-primary">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Загрузка данных...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Compare;
