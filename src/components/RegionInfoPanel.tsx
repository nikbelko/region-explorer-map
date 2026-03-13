import { useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { RegionStats } from "@/data/regions";
import { getRegionPopulation, getRegionArea } from "@/data/regionPopulation";

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

interface RegionInfoPanelProps {
  selectedRegion: string | null;
  regionStats: RegionStats | null;
  onClearRegion: () => void;
}

const RegionInfoPanel = ({ selectedRegion, regionStats, onClearRegion }: RegionInfoPanelProps) => {
  const [period, setPeriod] = useState<Period>("quarter");

  if (!selectedRegion) return null;

  const population = getRegionPopulation(selectedRegion);
  const area = getRegionArea(selectedRegion);
  const populationDensity = population && area
    ? Math.round((population * 1_000_000) / area)
    : null;
  const totalPoints = regionStats?.totalPoints ?? 0;

  const concentrationIndex = population && population > 0
    ? Math.round((totalPoints / (population * 1_000_000)) * 100_000 * 10) / 10
    : null;

  const top3Brands = regionStats?.brands.slice(0, 3) ?? [];
  const top3Share = totalPoints > 0
    ? Math.round(top3Brands.reduce((s, b) => s + b.count, 0) / totalPoints * 100)
    : 0;

  const totalDynamics = regionStats?.brands.reduce((sum, b) => {
    return sum + getBrandDynamics(selectedRegion, b.brand, period);
  }, 0) ?? 0;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
        <div>
          <h3 className="text-base font-bold text-gray-900 leading-tight">{selectedRegion}</h3>
          <p className="text-xs text-gray-400 mt-0.5">England · Region detail</p>
        </div>
        <button
          onClick={onClearRegion}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── 4 key metrics (2×2 grid) ── */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <p className="text-xs text-gray-400">Locations</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">{totalPoints}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Population</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {population ? `${population}M` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Per 100k</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {concentrationIndex !== null ? concentrationIndex : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Top-3 share</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              {totalPoints > 0 ? `${top3Share}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Area + density compact row ── */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-6 flex-shrink-0">
        <div>
          <p className="text-[11px] text-gray-400">Area</p>
          <p className="text-[13px] font-bold text-gray-700">
            {area ? `${area.toLocaleString()} km²` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">Pop. density</p>
          <p className="text-[13px] font-bold text-gray-700">
            {populationDensity ? `${populationDensity.toLocaleString()} / km²` : "—"}
          </p>
        </div>
      </div>

      {/* ── Period selector + dynamics ── */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
        {/* Period pills */}
        <div className="flex items-center gap-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1 rounded-md transition-colors font-medium ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Trending arrow + value */}
        <div className="flex items-center gap-1 ml-auto">
          {totalDynamics >= 0
            ? <TrendingUp className="w-4 h-4 text-emerald-500" />
            : <TrendingDown className="w-4 h-4 text-red-400" />
          }
          <span className={`text-sm font-bold ${totalDynamics >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {totalDynamics >= 0 ? "+" : ""}{totalDynamics}
          </span>
          <span className="text-[10px] text-gray-400">(exp.)</span>
        </div>
      </div>

      {/* ── Brand breakdown ── */}
      <div className="flex-1 overflow-y-auto">
        {regionStats && regionStats.totalPoints > 0 ? (
          <div className="px-4 py-3 space-y-2.5">
            {regionStats.brands.map((b) => {
              const dynamics = getBrandDynamics(selectedRegion, b.brand, period);
              return (
                <div key={b.brand}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-xs text-gray-700 flex-1 font-medium">{b.brand}</span>
                    <span className="text-xs font-bold text-gray-900">{b.count}</span>
                    <span className={`text-[10px] font-medium w-8 text-right ${dynamics >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                      {dynamics >= 0 ? "+" : ""}{dynamics}
                    </span>
                    <span className="text-[10px] text-gray-400 w-7 text-right">{b.percent}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic px-4 py-3">No locations match current filters</p>
        )}
      </div>

    </div>
  );
};

export default RegionInfoPanel;
