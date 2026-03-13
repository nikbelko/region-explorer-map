import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb, Map, BarChart2, List, Star, Settings, LogOut, Download } from "lucide-react";
import L from "leaflet";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { Brand, BRANDS, BRAND_COLOR_MAP } from "@/data/regions";
import { useRestaurantData } from "@/hooks/useRestaurantData";

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
  return Math.round(base * PERIOD_MULTIPLIERS[period] / 3);
}

interface RegionComparison {
  region: string;
  countA: number;
  countB: number;
  leader: "A" | "B" | "tie";
}

const NavBtn = ({
  icon, label, active = false, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <div className="relative group" style={{ isolation: "isolate" }}>
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
        active ? "bg-[#2d3139] text-white" : "text-[#6b7280] hover:text-white hover:bg-[#2d3139]"
      }`}
    >
      {icon}
    </button>
    <span
      className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ zIndex: 9999 }}
    >
      {label}
    </span>
  </div>
);

const BrandSelector = ({
  label, labelColor, value, onChange,
}: {
  label: string; labelColor: string; value: Brand; onChange: (b: Brand) => void;
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const openDropdown = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const brandColor = (BRAND_COLOR_MAP as Record<string, string>)[value] ?? labelColor;

  return (
    <div className="px-3 py-2.5 border-b border-[#d1d5db] last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: labelColor }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openDropdown(); }}
        className="flex items-center gap-2 bg-white border border-[#d1d5db] rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors w-full"
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor }} />
        <span className="flex-1 text-left">{value}</span>
        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999, background: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: "220px", overflowY: "auto" }}
        >
          {BRANDS.map((b) => {
            const color = (BRAND_COLOR_MAP as Record<string, string>)[b];
            const isSelected = b === value;
            return (
              <div key={b} onClick={() => { onChange(b); setOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2 text-xs border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-blue-50/80 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-700"}`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1">{b}</span>
                {isSelected && <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
    const map = L.map(mapRef.current, { center: [52.5, -1.5], zoom: 6 });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OSM &copy; CARTO', subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    mapInstance.current = map;
    markerLayerA.current = L.layerGroup().addTo(map);
    markerLayerB.current = L.layerGroup().addTo(map);
    fetch("/data/uk-regions.geojson").then((r) => r.json()).then((data) => {
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

  useEffect(() => {
    if (!markerLayerA.current || !markerLayerB.current) return;
    markerLayerA.current.clearLayers();
    markerLayerB.current.clearLayers();
    restaurants.forEach((r) => {
      const iA = r.brand === brandA, iB = r.brand === brandB;
      if (!iA && !iB) return;
      const color = iA ? BRAND_A_COLOR : BRAND_B_COLOR;
      const m = L.circleMarker([r.lat, r.lng], { radius: 5, fillColor: color, color: "#ffffff", weight: 1, fillOpacity: 0.9 });
      m.bindTooltip(`<strong style="color:${color}">${r.brand}</strong><br/>${r.name}`, { direction: "top", offset: [0, -6] });
      (iA ? markerLayerA : markerLayerB).current!.addLayer(m);
    });
  }, [brandA, brandB, restaurants]);

  const comparisons = useMemo<RegionComparison[]>(() => {
    if (!regionsData || restaurants.length === 0) return [];
    return (regionsData.features || []).map((feature: any) => {
      const name = feature?.properties?.ITL125NM || `Region ${feature?.id || "unknown"}`;
      let countA = 0, countB = 0;
      for (const r of restaurants) {
        if (r.brand !== brandA && r.brand !== brandB) continue;
        try {
          if (booleanPointInPolygon(turfPoint([r.lng, r.lat]), feature)) {
            if (r.brand === brandA) countA++; else countB++;
          }
        } catch { /**/ }
      }
      return { region: name, countA, countB, leader: countA > countB ? "A" : countB > countA ? "B" : "tie" as "A" | "B" | "tie" };
    }).sort((a: RegionComparison, b: RegionComparison) => (b.countA + b.countB) - (a.countA + a.countB));
  }, [regionsData, restaurants, brandA, brandB]);

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
  const overallLeader = totalA > totalB ? "A" : totalB > totalA ? "B" : "tie";

  const getDelta = useCallback((region: string) =>
    getBrandDynamics(region, brandA, period) - getBrandDynamics(region, brandB, period),
  [brandA, brandB, period]);

  const totalDelta = comparisons.reduce((s, c) => s + getDelta(c.region), 0);

  const insights = useMemo(() => {
    if (!comparisons.length) return [];
    const res: string[] = [];
    const aWins = comparisons.filter((c) => c.leader === "A").length;
    res.push(`${brandA} leads in ${aWins} of ${comparisons.length} regions`);
    const bWins = comparisons.filter((c) => c.leader === "B");
    if (bWins.length) {
      const shown = bWins.slice(0, 2).map((c) => c.region).join(", ");
      res.push(`${brandB} leads in: ${shown}${bWins.length > 2 ? ` +${bWins.length - 2} more` : ""}`);
    } else res.push(`${brandB} leads in no regions`);
    let maxGap = 0, maxGapR = "", maxGapW = "";
    for (const c of comparisons) {
      const g = Math.abs(c.countA - c.countB);
      if (g > maxGap) { maxGap = g; maxGapR = c.region; maxGapW = c.countA > c.countB ? brandA : brandB; }
    }
    if (maxGap) res.push(`Biggest gap: ${maxGapW} leads by ${maxGap} in ${maxGapR}`);
    const avgA = (comparisons.reduce((s, c) => s + getBrandDynamics(c.region, brandA, period), 0) / comparisons.length).toFixed(1);
    const avgB = (comparisons.reduce((s, c) => s + getBrandDynamics(c.region, brandB, period), 0) / comparisons.length).toFixed(1);
    res.push(`This ${PERIOD_LABELS[period].toLowerCase()}: ${brandA} avg ${Number(avgA) >= 0 ? "+" : ""}${avgA} vs ${brandB} ${Number(avgB) >= 0 ? "+" : ""}${avgB}`);
    return res;
  }, [comparisons, brandA, brandB, period]);

  const isLoading = dataLoading || mapLoading;

  /* Fixed column widths to prevent layout shift on delta change */
  const colW = { region: 130, a: 68, b: 68, leader: 100, delta: 48 };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <nav className="w-12 flex-shrink-0 bg-[#1e2128] flex flex-col items-center py-3 gap-1" style={{ zIndex: 9998, position: "relative" }}>
        <div className="w-8 h-8 mb-4 flex items-center justify-center">
          <svg viewBox="0 0 107.57 137.26" className="w-5 h-5" fill="#9a9d9e"><path d="M77,60.2c17.98,6.17,31.89-14.53,21.26-30.29C89.01,16.2,73.41,7.2,55.72,7.2C27.33,7.2,4.31,30.4,4.31,59.03c0,33.56,38.08,63.1,48.7,70.68c1.65,1.18,3.78,1.18,5.43,0c5.79-4.13,19.74-14.8,31.24-29.08c8.85-11,3.92-26.29-8.16-33.59c-7.96-4.81-19.96-4.13-23.53,4.45c-1.76,4.23-1.72,8.9,2.87,13.5C71.27,95.39,40.3,98.85,40.3,74.58c0-19.82,21.52-22.05,28.92-17.89C71.88,58.18,74.48,59.33,77,60.2z" /></svg>
        </div>
        <NavBtn icon={<Map className="w-4 h-4" />} label="Country Explorer" onClick={() => navigate("/")} />
        <NavBtn icon={<BarChart2 className="w-4 h-4" />} label="Compare brands" active />
        <NavBtn icon={<List className="w-4 h-4" />} label="Chains list" />
        <NavBtn icon={<Star className="w-4 h-4" />} label="Saved" />
        <div className="flex-1" />
        <NavBtn icon={<Download className="w-4 h-4" />} label="Export data" />
        <NavBtn icon={<Settings className="w-4 h-4" />} label="Settings" />
      </nav>

      <main className="flex-1 relative overflow-hidden">
        <div ref={mapRef} className="w-full h-full" />
        {insights.length > 0 && (
          <div className="absolute bottom-5 z-[1000] bg-white border border-gray-200 rounded-lg shadow-sm p-3"
            style={{ left: "50%", transform: "translateX(-50%)", width: "520px", maxWidth: "calc(100% - 32px)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Insights</h4>
            </div>
            <div className="space-y-1">
              {insights.map((t, i) => <p key={i} className="text-xs text-gray-600">• {t}</p>)}
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

      {/* Right panel */}
      <aside className="flex-shrink-0 border-l border-[#d1d5db] bg-[#f0f2f5] flex flex-col" style={{ width: "460px", overflow: "visible", position: "relative", zIndex: 20 }}>
        <div className="px-4 py-3 border-b border-[#d1d5db] flex-shrink-0">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors mb-2">
            <ArrowLeft className="w-3 h-3" />Country Explorer
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Brand Comparison</h1>
          <p className="text-xs text-gray-400 mt-0.5">Great Britain · Head-to-head</p>
        </div>

        {/* Brand selectors */}
        <div className="mx-2 mt-2 bg-white rounded-lg border border-[#e5e7eb] flex-shrink-0" style={{ overflow: "visible" }}>
          <BrandSelector label="Brand A" labelColor={BRAND_A_COLOR} value={brandA} onChange={setBrandA} />
          <BrandSelector label="Brand B" labelColor={BRAND_B_COLOR} value={brandB} onChange={setBrandB} />
        </div>

        {/* Table — fixed-layout to prevent column shift */}
        <div className="mx-2 mt-2 mb-2 bg-white rounded-lg border border-[#e5e7eb] overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Regions</span>
            <div className="flex items-center gap-0.5">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${period === p ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed text-xs border-collapse">
              <colgroup>
                <col style={{ width: colW.region }} />
                <col style={{ width: colW.a }} />
                <col style={{ width: colW.b }} />
                <col style={{ width: colW.leader }} />
                <col style={{ width: colW.delta }} />
              </colgroup>
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Region</th>
                  <th className="text-right px-2 py-2 text-[10px] font-semibold" style={{ color: BRAND_A_COLOR }}>{brandA}</th>
                  <th className="text-right px-2 py-2 text-[10px] font-semibold" style={{ color: BRAND_B_COLOR }}>{brandB}</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Leader</th>
                  <th className="text-right px-2 py-2 text-[10px] font-semibold text-gray-400">Δ</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c) => {
                  const delta = getDelta(c.region);
                  const isSelected = selectedRegion === c.region;
                  return (
                    <tr key={c.region} onClick={() => setSelectedRegion(c.region)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-700 truncate">{c.region}</td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums" style={{ color: c.leader === "A" ? BRAND_A_COLOR : "#374151" }}>{c.countA}</td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums" style={{ color: c.leader === "B" ? BRAND_B_COLOR : "#374151" }}>{c.countB}</td>
                      <td className="px-2 py-2 font-medium truncate" style={{ color: c.leader === "A" ? BRAND_A_COLOR : c.leader === "B" ? BRAND_B_COLOR : "#9ca3af" }}>
                        {c.leader === "tie" ? "—" : c.leader === "A" ? brandA : brandB}
                      </td>
                      <td className={`px-2 py-2 text-right font-medium tabular-nums ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-gray-400"}`}>
                        {delta > 0 ? "+" : ""}{delta}
                      </td>
                    </tr>
                  );
                })}
                {comparisons.length > 0 && (
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="px-3 py-2 text-gray-700">Total</td>
                    <td className="px-2 py-2 text-right tabular-nums" style={{ color: overallLeader === "A" ? BRAND_A_COLOR : "#374151" }}>{totalA}</td>
                    <td className="px-2 py-2 text-right tabular-nums" style={{ color: overallLeader === "B" ? BRAND_B_COLOR : "#374151" }}>{totalB}</td>
                    <td className="px-2 py-2 truncate" style={{ color: overallLeader === "A" ? BRAND_A_COLOR : overallLeader === "B" ? BRAND_B_COLOR : "#374151" }}>
                      {overallLeader === "tie" ? "—" : overallLeader === "A" ? brandA : brandB}
                    </td>
                    <td className={`px-2 py-2 text-right tabular-nums ${totalDelta > 0 ? "text-emerald-600" : totalDelta < 0 ? "text-red-500" : "text-gray-400"}`}>
                      {totalDelta > 0 ? "+" : ""}{totalDelta}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Compare;
