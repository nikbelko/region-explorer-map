import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb } from "lucide-react";
import L from "leaflet";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { Brand, BRANDS, BRAND_CONFIGS } from "@/data/regions";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const BRAND_A_COLOR = "#3B82F6";
const BRAND_B_COLOR = "#F97316";

type Period = "month" | "quarter" | "year";
const PERIOD_LABELS: Record<Period, string> = { month: "месяц", quarter: "квартал", year: "год" };
const PERIOD_MULTIPLIERS: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return h;
}

function getBrandDynamics(region: string, brand: string, period: Period): number {
  const base = (Math.abs(hashStr(`${region}:${brand}`)) % 21) - 6;
  return Math.round(base * PERIOD_MULTIPLIERS[period] / 3);
}

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
  const [period, setPeriod] = useState<Period>("quarter");

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.GeoJSON | null>(null);
  const markerLayerA = useRef<L.LayerGroup | null>(null);
  const markerLayerB = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [52.5, -1.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
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
        const geoLayer = L.geoJSON(data, {
          style: () => ({ color: "hsl(220, 13%, 80%)", weight: 1.5, fillColor: "hsl(220, 14%, 90%)", fillOpacity: 0.4 }),
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

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (!markerLayerA.current || !markerLayerB.current) return;
    markerLayerA.current.clearLayers();
    markerLayerB.current.clearLayers();

    restaurants.forEach((r) => {
      if (r.brand === brandA) {
        const m = L.circleMarker([r.lat, r.lng], { radius: 5, fillColor: BRAND_A_COLOR, color: BRAND_A_COLOR, weight: 1, fillOpacity: 0.85 });
        m.bindTooltip(`<strong style="color:${BRAND_A_COLOR}">${r.brand}</strong><br/>${r.name}`, { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerA.current!.addLayer(m);
      } else if (r.brand === brandB) {
        const m = L.circleMarker([r.lat, r.lng], { radius: 5, fillColor: BRAND_B_COLOR, color: BRAND_B_COLOR, weight: 1, fillOpacity: 0.85 });
        m.bindTooltip(`<strong style="color:${BRAND_B_COLOR}">${r.brand}</strong><br/>${r.name}`, { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerB.current!.addLayer(m);
      }
    });
  }, [brandA, brandB, restaurants]);

  const comparisons = useMemo<RegionComparison[]>(() => {
    if (!regionsData || restaurants.length === 0) return [];
    const features = regionsData.features || [];
    const results: RegionComparison[] = [];

    for (const feature of features) {
      const name = feature?.properties?.ITL125NM || `Region ${feature?.id || "unknown"}`;
      let countA = 0, countB = 0;
      for (const r of restaurants) {
        if (r.brand !== brandA && r.brand !== brandB) continue;
        try {
          const pt = turfPoint([r.lng, r.lat]);
          if (booleanPointInPolygon(pt, feature)) {
            if (r.brand === brandA) countA++; else countB++;
          }
        } catch { /* skip */ }
      }
      results.push({ region: name, countA, countB, leader: countA > countB ? "A" : countB > countA ? "B" : "tie" });
    }
    return results.sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));
  }, [regionsData, restaurants, brandA, brandB]);

  useEffect(() => {
    if (!layersRef.current) return;
    const leaderMap: Record<string, "A" | "B" | "tie"> = {};
    for (const c of comparisons) leaderMap[c.region] = c.leader;

    layersRef.current.eachLayer((layer: any) => {
      const name = layer._regionName;
      const isSelected = name === selectedRegion;
      const leader = leaderMap[name];
      const fillColor = leader === "A" ? BRAND_A_COLOR : leader === "B" ? BRAND_B_COLOR : "hsl(220, 14%, 85%)";
      layer.setStyle({
        fillColor,
        fillOpacity: isSelected ? 0.65 : 0.35,
        weight: isSelected ? 3 : 1.5,
        color: isSelected ? "hsl(220, 20%, 30%)" : "hsl(220, 13%, 80%)",
      });
      if (isSelected) layer.bringToFront();
    });
  }, [selectedRegion, comparisons]);

  const totalA = comparisons.reduce((s, c) => s + c.countA, 0);
  const totalB = comparisons.reduce((s, c) => s + c.countB, 0);
  const overallLeader = totalA > totalB ? "A" : totalB > totalA ? "B" : "tie";

  const getDelta = useCallback((region: string) => {
    return getBrandDynamics(region, brandA, period) - getBrandDynamics(region, brandB, period);
  }, [brandA, brandB, period]);

  const totalDelta = comparisons.reduce((s, c) => s + getDelta(c.region), 0);

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

    let maxGap = 0, maxGapRegion = "", maxGapWinner = "";
    for (const c of comparisons) {
      const gap = Math.abs(c.countA - c.countB);
      if (gap > maxGap) { maxGap = gap; maxGapRegion = c.region; maxGapWinner = c.countA > c.countB ? brandA : brandB; }
    }
    if (maxGap > 0) result.push(`Макс. разрыв: ${maxGapWinner} +${maxGap} в ${maxGapRegion}`);

    if (comparisons.length > 0) {
      const avgA = comparisons.reduce((s, c) => s + getBrandDynamics(c.region, brandA, period), 0) / comparisons.length;
      const avgB = comparisons.reduce((s, c) => s + getBrandDynamics(c.region, brandB, period), 0) / comparisons.length;
      result.push(`За ${PERIOD_LABELS[period]}: ${brandA} ${avgA >= 0 ? "+" : ""}${avgA.toFixed(1)}/рег. vs ${brandB} ${avgB >= 0 ? "+" : ""}${avgB.toFixed(1)}/рег.`);
    }
    return result;
  }, [comparisons, brandA, brandB, period]);

  const isLoading = dataLoading || mapLoading;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-sm">
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
          <div className="absolute bottom-4 left-4 right-[180px] z-[1000] bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Инсайты</h4>
            </div>
            <div className="space-y-1">
              {insights.map((text, i) => (
                <p key={i} className="text-xs text-foreground/80">• {text}</p>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-[1000]">
            <div className="flex items-center gap-3 text-primary">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Загрузка данных...</span>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <aside className="w-[380px] min-w-[320px] border-l border-border bg-card flex flex-col">
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
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Getplace</span>
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
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
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
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
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

          {/* Period selector + Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-secondary/50">
              <span className="text-[10px] text-muted-foreground">Динамика за</span>
              <div className="flex items-center gap-0.5">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background"
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-[10px] h-8 px-2">Region</TableHead>
                  <TableHead className="text-[10px] h-8 px-2 text-right" style={{ color: BRAND_A_COLOR }}>A</TableHead>
                  <TableHead className="text-[10px] h-8 px-2 text-right" style={{ color: BRAND_B_COLOR }}>B</TableHead>
                  <TableHead className="text-[10px] h-8 px-2">Leader</TableHead>
                  <TableHead className="text-[10px] h-8 px-2 text-right">Δ <span className="text-muted-foreground">(эксп.)</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((c) => {
                  const delta = getDelta(c.region);
                  return (
                    <TableRow
                      key={c.region}
                      className={`border-b border-border/50 cursor-pointer hover:bg-secondary/50 ${selectedRegion === c.region ? "bg-secondary" : ""}`}
                      onClick={() => setSelectedRegion(c.region)}
                    >
                      <TableCell className="text-xs py-1.5 px-2">{c.region}</TableCell>
                      <TableCell className="text-xs py-1.5 px-2 text-right font-medium">{c.countA}</TableCell>
                      <TableCell className="text-xs py-1.5 px-2 text-right font-medium">{c.countB}</TableCell>
                      <TableCell className="text-xs py-1.5 px-2">
                        {c.leader === "tie" ? <span className="text-muted-foreground">—</span> : (
                          <span style={{ color: c.leader === "A" ? BRAND_A_COLOR : BRAND_B_COLOR }}>
                            {c.leader === "A" ? brandA : brandB}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`text-xs py-1.5 px-2 text-right font-medium ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {delta > 0 ? "+" : ""}{delta}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {comparisons.length > 0 && (
                  <TableRow className="border-t border-border font-semibold bg-secondary/30">
                    <TableCell className="text-xs py-1.5 px-2">Total</TableCell>
                    <TableCell className="text-xs py-1.5 px-2 text-right">{totalA}</TableCell>
                    <TableCell className="text-xs py-1.5 px-2 text-right">{totalB}</TableCell>
                    <TableCell className="text-xs py-1.5 px-2">
                      {overallLeader === "tie" ? <span className="text-muted-foreground">—</span> : (
                        <span style={{ color: overallLeader === "A" ? BRAND_A_COLOR : BRAND_B_COLOR }}>
                          {overallLeader === "A" ? brandA : brandB}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`text-xs py-1.5 px-2 text-right font-medium ${totalDelta > 0 ? "text-green-600" : totalDelta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                      {totalDelta > 0 ? "+" : ""}{totalDelta}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Compare;
