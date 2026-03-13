import { useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { RegionStats } from "@/data/regions";
import { getRegionPopulation, getRegionArea } from "@/data/regionPopulation";

type Period = "month" | "quarter" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

const PERIOD_MULTIPLIERS: Record<Period, number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
  }
  return h;
}

function getBrandDynamics(region: string, brand: string, period: Period): number {
  const base = (Math.abs(hashStr(`${region}:${brand}`)) % 21) - 6;
  return Math.round(base * PERIOD_MULTIPLIERS[period] / 3);
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

  const totalDynamics = regionStats?.brands.reduce((sum, b) =>
    sum + getBrandDynamics(selectedRegion, b.brand, period), 0) ?? 0;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 leading-tight">{selectedRegion}</h2>
            <p className="text-xs text-gray-400 mt-0.5">England · Region detail</p>
          </div>
          <button
            onClick={onClearRegion}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Key stats grid */}
      <div className="px-4 py-3 border-b border-gray-200 grid grid-cols-2 gap-3 flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Locations</p>
          <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
        </div>
        {population && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Population</p>
            <p className="text-2xl font-bold text-gray-900">{population}M</p>
          </div>
        )}
        {concentrationIndex !== null && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Per 100k</p>
            <p className="text-lg font-bold text-gray-900">{concentrationIndex}</p>
          </div>
        )}
        {totalPoints > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Top-3 share</p>
            <p className="text-lg font-bold text-gray-900">{top3Share}%</p>
          </div>
        )}
      </div>

      {/* Area / density */}
      {(area || populationDensity) && (
        <div className="px-4 py-2.5 border-b border-gray-200 flex gap-4 flex-shrink-0">
          {area && (
            <div>
              <p className="text-[10px] text-gray-400">Area</p>
              <p className="text-xs font-medium text-gray-700">{area.toLocaleString()} km²</p>
            </div>
          )}
          {populationDensity && (
            <div>
              <p className="text-[10px] text-gray-400">Pop. density</p>
              <p className="text-xs font-medium text-gray-700">{populationDensity.toLocaleString()} / km²</p>
            </div>
          )}
        </div>
      )}

      {/* Period selector + dynamics */}
      <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors font-medium ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold ${
          totalDynamics >= 0 ? "text-emerald-600" : "text-red-500"
        }`}>
          {totalDynamics >= 0
            ? <TrendingUp className="w-3.5 h-3.5" />
            : <TrendingDown className="w-3.5 h-3.5" />
          }
          {totalDynamics >= 0 ? "+" : ""}{totalDynamics}
          <span className="text-[10px] text-gray-400 font-normal ml-0.5">(exp.)</span>
        </div>
      </div>

      {/* Chains breakdown */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Chains</span>
          <span className="text-[10px] text-gray-400">Locations · Share</span>
        </div>

        {regionStats && regionStats.totalPoints > 0 ? (
          regionStats.brands.map((b) => {
            const dynamics = getBrandDynamics(selectedRegion, b.brand, period);
            return (
              <div key={b.brand} className="px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                  <span className="text-sm text-gray-700 flex-1 font-medium">{b.brand}</span>
                  <span className="text-sm font-bold text-gray-900">{b.count}</span>
                  <span className="text-xs text-gray-400 w-8 text-right">{b.percent}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${b.percent}%`, backgroundColor: b.color }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium w-8 text-right ${
                    dynamics >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {dynamics >= 0 ? "+" : ""}{dynamics}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-400 italic px-4 py-4">No locations matching filters</p>
        )}
      </div>

    </div>
  );
};

export default RegionInfoPanel;
