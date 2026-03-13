import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb, Map, BarChart2, List, Star, Settings, LogOut, ChevronRight } from "lucide-react";
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
const PERIOD_LABELS: Record<Period, string> = { month: "Month", quarter: "Quarter", year: "Year" };
const PERIOD_MULTIPLIERS: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return h;
}
function getBrandDynamics(region: string, brand: string, period: Period): number {
  const base = (Math.abs(hashStr(`${region}:${brand}`)) % 21) - 6;
  return Math.round((base * PERIOD_MULTIPLIERS[period]) / 3);
}

interface RegionComparison { region: string; countA: number; countB: number; leader: "A" | "B" | "tie"; }

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

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { center: [52.5, -1.5], zoom: 6, zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    mapInstance.current = map;
    markerLayerA.current = L.layerGroup().addTo(map);
    markerLayerB.current = L.layerGroup().addTo(map);

    fetch("/data/uk-regions.geojson").then((res) => res.json()).then((data) => {
      setRegionsData(data);
      const geoLayer = L.geoJSON(data, {
        style: () => ({ color: "#ffffff", weight: 1.5, fillColor: "#e5e7eb", fillOpacity: 0.5 }),
        onEachFeature: (feature, layer) => {
          const name = feature?.properties?.ITL125NM || `Region ${feature?.id || "unknown"}`;
          (layer as any)._regionName = name;
          layer.on("click", () => setSelectedRegion(name));
        },
      }).addTo(map);
      layersRef.current = geoLayer;
      setMapLoading(false);
    }).catch(() => setMapLoading(false));

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Update markers when brands change
  useEffect(() => {
    if (!markerLayerA.current || !markerLayerB.current) return;
    markerLayerA.current.clearLayers();
    markerLayerB.current.clearLayers();
    restaurants.forEach((r) => {
      if (r.brand === brandA) {
        const m = L.circleMarker([r.lat, r.lng], { radius: 5, fillColor: BRAND_A_COLOR, color: "#fff", weight: 1, fillOpacity: 0.9 });
        m.bindTooltip(`<strong style="color:${BRAND_A_COLOR}">${r.brand}</strong><br/>${r.name}`, { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerA.current!.addLayer(m);
      } else if (r.brand === brandB) {
        const m = L.circleMarker([r.lat, r.lng], { radius: 5, fillColor: BRAND_B_COLOR, color: "#fff", weight: 1, fillOpacity: 0.9 });
        m.bindTooltip(`<strong style="color:${BRAND_B_COLOR}">${r.brand}</strong><br/>${r.name}`, { direction: "top", offset: [0, -6], className: "brand-tooltip" });
        markerLayerB.current!.addLayer(m);
      }
    });
  }, [brandA, brandB, restaurants]);

  // Comparisons per region
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
          if (booleanPointInPolygon(turfPoint([r.lng, r.lat]), feature)) {
            if (r.brand === brandA) countA++;
            else countB++;
          }
        } catch { /**/ }
      }
      results.push({ region: name, countA, countB, leader: countA > countB ? "A" : countB > countA ? "B" : "tie" });
    }
    return results.sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));
  }, [regionsData, restaurants, brandA, brandB]);

  // Color regions
  useEffect(() => {
    if (!layersRef.current) return;
    const leaderMap: Record<string, "A" | "B" | "tie"> = {};
    for (const c of comparisons) leaderMap[c.region] = c.leader;
    layersRef.current.eachLayer((layer: any) => {
      const name = layer._regionName;
      const isSelected = name === selectedRegion;
      const leader = leaderMap[name];
      const fillColor = leader === "A" ? BRAND_A_COLOR : leader === "B" ? BRAND_B_COLOR : "#e5e7eb";
      layer.setStyle({ fillColor, fillOpacity: isSelected ? 0.7 : 0.4, weight: isSelected ? 3 : 1.5, color: isSelected ? "#1d4ed8" : "#ffffff" });
      if (isSelected) layer.bringToFront();
    });
  }, [selectedRegion, comparisons]);

  const totalA = comparisons.reduce((s, c) => s + c.countA, 0);
  const totalB = comparisons.reduce((s, c) => s + c.countB, 0);
  const overallLeader: "A" | "B" | "tie" = totalA > totalB ? "A" : totalB > totalA ? "B" : "tie";

  const getDelta = useCallback((region: string) =>
    getBrandDynamics(region, brandA, period) - getBrandDynamics(region, brandB, period),
  [brandA, brandB, period]);

  const totalDelta = comparisons.reduce((s, c) => s + getDelta(c.region), 0);

  // ── Insights ──────────────────────────────────────────────
  const insights = useMemo(() => {
    if (comparisons.length === 0) return [];
    const result: { text: string }[] = [];

    const aWins = comparisons.filter((c) => c.leader === "A").length;
    result.push({ text: `${brandA} leads in ${aWins} of ${comparisons.length} regions` });

    const bWinRegions = comparisons.filter((c) => c.leader === "B").map((c) => c.region);
    if (bWinRegions.length > 0) {
      const shown = bWinRegions.slice(0, 2).map((r) => r.replace(" (England)", "")).join(", ");
      const suffix = bWinRegions.length > 2 ? ` +${bWinRegions.length - 2} more` : "";
      result.push({ text: `${brandB} leads in: ${shown}${suffix}` });
    } else {
      result.push({ text: `${brandB} leads in no regions` });
    }

    let maxGap = 0, maxGapRegion = "", maxGapWinner = "";
    for (const c of comparisons) {
      const gap = Math.abs(c.countA - c.countB);
      if (gap > maxGap) { maxGap = gap; maxGapRegion = c.region.replace(" (England)", ""); maxGapWinner = c.countA > c.countB ? brandA : brandB; }
    }
    if (maxGap > 0) result.push({ text: `Biggest gap: ${maxGapWinner} leads by ${maxGap} in ${maxGapRegion}` });

    if (comparisons.length > 0) {
      const avgA = (comparisons.reduce((s, c) => s + getBrandDynamics(c.region, brandA, period), 0) / comparisons.length).toFixed(1);
      const avgB = (comparisons.reduce((s, c) => s + getBrandDynamics(c.region, brandB, period), 0) / comparisons.length).toFixed(1);
      const periodLabel = PERIOD_LABELS[period].toLowerCase();
      result.push({
        text: `This ${periodLabel}: ${brandA} increased ${Number(avgA) >= 0 ? "+" : ""}${avgA} locations vs ${brandB} ${Number(avgB) >= 0 ? "+" : ""}${avgB}`,
      });
    }

    // Major increase line
    const dynA = comparisons.map((c) => ({ region: c.region.replace(" (England)", ""), val: getBrandDynamics(c.region, brandA, period) })).sort((a, b) => b.val - a.val)[0];
    const dynB = comparisons.map((c) => ({ region: c.region.replace(" (England)", ""), val: getBrandDynamics(c.region, brandB, period) })).sort((a, b) => b.val - a.val)[0];
    if (dynA && dynB) {
      result.push({
        text: `The major increase of ${brandA} — ${dynA.region} (+${dynA.val}), ${brandB} — ${dynB.region} (+${dynB.val})`,
      });
    }

    return result;
  }, [comparisons, brandA, brandB, period]);

  const isLoading = dataLoading || mapLoading;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">

      {/* Navbar - слева */}
      <nav className="w-12 flex-shrink-0 bg-[#1e2128] flex flex-col items-center py-3 gap-1 z-20">
        <div className="w-8 h-8 mb-4 flex items-center justify-center">
          <svg viewBox="0 0 107.57 137.26" className="w-5 h-5" fill="#9a9d9e">
            <path d="M77,60.2c17.98,6.17,31.89-14.53,21.26-30.29C89.01,16.2,73.41,7.2,55.72,7.2C27.33,7.2,4.31,30.4,4.31,59.03c0,33.56,38.08,63.1,48.7,70.68c1.65,1.18,3.78,1.18,5.43,0c5.79-4.13,19.74-14.8,31.24-29.08c8.85-11,3.92-26.29-8.16-33.59c-7.96-4.81-19.96-4.13-23.53,4.45c-1.76,4.23-1.72,8.9,2.87,13.5C71.27,95.39,40.3,98.85,40.3,74.58c0-19.82,21.52-22.05,28.92-17.89C71.88,58.18,74.48,59.33,77,60.2z" />
          </svg>
        </div>
        <button onClick={() => navigate("/")} title="Map" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors">
          <Map className="w-4 h-4" />
        </button>
        <button title="Analytics" className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2d3139] text-white">
          <BarChart2 className="w-4 h-4" />
        </button>
        <button title="List" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors">
          <List className="w-4 h-4" />
        </button>
        <button title="Saved" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors">
          <Star className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button title="Settings" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button title="Logout" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </nav>

      {/* Map - по центру */}
      <main className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Map legend */}
        <div className="absolute bottom-5 right-5 z-[1000] bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Legend</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_A_COLOR }} />
              <span className="text-xs text-gray-600">{brandA}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_B_COLOR }} />
              <span className="text-xs text-gray-600">{brandB}</span>
            </div>
          </div>
        </div>

        {/* Insights — все не жирные */}
        {insights.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-white border border-gray-200 rounded-lg shadow-sm p-3.5"
               style={{ right: 170 }}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Insights</h4>
            </div>
            <div className="space-y-1">
              {insights.map((item, i) => (
                <p key={i} className="text-xs text-gray-500">
                  · {item.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-[1000]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-600">Loading data...</span>
            </div>
          </div>
        )}
      </main>

      {/* Правая панель Brand Comparison */}
      <aside className="w-[380px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2.5">
            <button onClick={() => navigate("/")} className="font-medium text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Country Explorer
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-gray-700">Compare</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-900">Brand Comparison</h1>
          <p className="text-xs text-gray-400 mt-0.5">Great Britain · Head-to-head</p>
        </div>

        {/* Brand selectors — 2 columns on same level */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            {/* Brand A */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND_A_COLOR }} />
                Brand A
              </label>
              <select
                value={brandA}
                onChange={(e) => setBrandA(e.target.value as Brand)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                style={{ borderLeft: `3px solid ${BRAND_A_COLOR}` }}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {/* Brand B */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND_B_COLOR }} />
                Brand B
              </label>
              <select
                value={brandB}
                onChange={(e) => setBrandB(e.target.value as Brand)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-white focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none"
                style={{ borderLeft: `3px solid ${BRAND_B_COLOR}` }}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table area */}
        <div className="flex-1 overflow-y-auto">
          {/* Period selector */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 sticky top-0 bg-white z-10">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Trend</span>
            <div className="flex items-center gap-0.5">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                    period === p ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Comparison table — region col allows 2-line wrap */}
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 bg-gray-50">
                <TableHead className="text-[10px] h-8 px-3 font-semibold uppercase tracking-wider text-gray-400 w-[130px]">Region</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right font-semibold w-12" style={{ color: BRAND_A_COLOR }}>A</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right font-semibold w-12" style={{ color: BRAND_B_COLOR }}>B</TableHead>
                <TableHead className="text-[10px] h-8 px-2 font-semibold uppercase tracking-wider text-gray-400">Leader</TableHead>
                <TableHead className="text-[10px] h-8 px-2 text-right font-semibold text-gray-400 w-12">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((c) => {
                const delta = getDelta(c.region);
                const isSelected = selectedRegion === c.region;
                // Short region name for display (strip "(England)")
                const displayName = c.region.replace(" (England)", "");
                const gap = Math.abs(c.countA - c.countB);
                return (
                  <TableRow
                    key={c.region}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedRegion(c.region)}
                  >
                    {/* Region — wraps to 2 lines */}
                    <TableCell className="text-xs py-2 px-3 font-medium leading-tight" style={{ verticalAlign: "middle" }}>
                      <span className="text-gray-700 break-words">{displayName}</span>
                    </TableCell>
                    <TableCell className="text-xs py-2 px-2 text-right font-semibold text-gray-800">{c.countA}</TableCell>
                    <TableCell className="text-xs py-2 px-2 text-right font-semibold text-gray-800">{c.countB}</TableCell>
                    {/* Leader + gap in grey */}
                    <TableCell className="text-xs py-2 px-2">
                      {c.leader === "tie" ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium" style={{ color: c.leader === "A" ? BRAND_A_COLOR : BRAND_B_COLOR }}>
                            {c.leader === "A" ? brandA : brandB}
                          </span>
                          {gap > 0 && (
                            <span className="text-[10px] text-gray-400 tabular-nums">+{gap}</span>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`text-xs py-2 px-2 text-right font-medium tabular-nums ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-gray-400"}`}>
                      {delta > 0 ? "+" : ""}{delta}
                    </TableCell>
                  </TableRow>
                );
              })}

              {comparisons.length > 0 && (
                <TableRow className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <TableCell className="text-xs py-2 px-3 font-bold" style={{ color: overallLeader === "A" ? BRAND_A_COLOR : overallLeader === "B" ? BRAND_B_COLOR : "#374151", backgroundColor: overallLeader === "A" ? `${BRAND_A_COLOR}18` : overallLeader === "B" ? `${BRAND_B_COLOR}18` : "transparent" }}>
                    Total
                  </TableCell>
                  <TableCell className="text-xs py-2 px-2 text-right font-bold text-gray-900">{totalA}</TableCell>
                  <TableCell className="text-xs py-2 px-2 text-right font-bold text-gray-900">{totalB}</TableCell>
                  <TableCell className="text-xs py-2 px-2">
                    {overallLeader === "tie" ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className="flex flex-col leading-tight">
                        <span className="font-bold" style={{ color: overallLeader === "A" ? BRAND_A_COLOR : BRAND_B_COLOR }}>
                          {overallLeader === "A" ? brandA : brandB}
                        </span>
                        {Math.abs(totalA - totalB) > 0 && (
                          <span className="text-[10px] text-gray-400 tabular-nums">+{Math.abs(totalA - totalB)}</span>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={`text-xs py-2 px-2 text-right font-bold tabular-nums ${totalDelta > 0 ? "text-emerald-600" : totalDelta < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {totalDelta > 0 ? "+" : ""}{totalDelta}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </aside>
    </div>
  );
};

export default Compare;
