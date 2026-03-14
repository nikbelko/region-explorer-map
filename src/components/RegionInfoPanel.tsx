import { useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { RegionStats } from "@/data/regions";
import { getRegionPopulation, getRegionArea } from "@/data/regionPopulation";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from "recharts";

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

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-2 mt-2 bg-white rounded-lg border border-[#e5e7eb] ${className}`}>{children}</div>
);

// Максимальные значения по стране (константы)
const COUNTRY_MAX = {
  saturation: 35,
  topShare: 100,
  chainDensity: 45,
  growthRate: 60
};

// Средние значения по стране (константы)
const COUNTRY_AVG = {
  saturation: 12.5,
  topShare: 65,
  chainDensity: 8.3,
  growthRate: 15
};

type TabType = "brands" | "radar";

// Функция для определения цвета значения метрики
const getMetricValueColor = (value: number | null, metric: string, vsAvg: number | null): string => {
  if (value === null) return "text-gray-900";
  
  // Для Saturation Index: низкое значение (ниже среднего) = зеленый (хороший потенциал)
  if (metric === "saturation" && vsAvg !== null) {
    return vsAvg < 0 ? "text-emerald-600" : "text-gray-900";
  }
  
  // Для Chain Density: высокое значение (выше среднего) = красный (высокая конкуренция)
  if (metric === "chain" && vsAvg !== null) {
    return vsAvg > 0 ? "text-red-500" : "text-gray-900";
  }
  
  // Для Top share: по умолчанию серый
  if (metric === "top") {
    return "text-gray-900";
  }
  
  return "text-gray-900";
};

// Функция для расчета процентной разницы
const getPercentDiff = (value: number, avg: number): string => {
  if (avg === 0) return "";
  const diff = ((value - avg) / Math.abs(avg)) * 100;
  const roundedDiff = Math.round(diff * 10) / 10;
  return `${roundedDiff > 0 ? '+' : ''}${roundedDiff}%`;
};

// Функция для определения названия метрики концентрации
const getConcentrationLabel = (totalBrands: number): string => {
  if (totalBrands >= 4) return "Top-3 share";
  if (totalBrands === 3) return "Top-2 share";
  if (totalBrands === 2) return "Top-1 share";
  return "Share";
};

// Функция для безопасного округления до 2 знаков
const safeRound = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const RegionInfoPanel = ({ selectedRegion, regionStats, onClearRegion }: RegionInfoPanelProps) => {
  const [period, setPeriod] = useState<Period>("quarter");
  const [activeTab, setActiveTab] = useState<TabType>("brands");

  if (!selectedRegion) return null;

  const population = getRegionPopulation(selectedRegion);
  const area = getRegionArea(selectedRegion);
  const populationDensity = population && area ? Math.round((population * 1_000_000) / area) : null;
  const totalPoints = regionStats?.totalPoints ?? 0;
  
  // Saturation Index
  const saturationIndex =
    population && population > 0
      ? Math.round((totalPoints / (population * 1_000_000)) * 100_000 * 10) / 10
      : null;
  
  // Chain Density
  const chainDensity =
    area && area > 0
      ? Math.round((totalPoints / area) * 1000 * 10) / 10
      : null;
  
  // Динамическая метрика концентрации
  const totalBrandsInRegion = regionStats?.brands.length ?? 0;
  const concentrationLabel = getConcentrationLabel(totalBrandsInRegion);
  
  let topBrandsCount = 3;
  if (totalBrandsInRegion === 3) topBrandsCount = 2;
  else if (totalBrandsInRegion === 2) topBrandsCount = 1;
  else if (totalBrandsInRegion < 2) topBrandsCount = 0;
  
  const topBrands = regionStats?.brands.slice(0, topBrandsCount) ?? [];
  const topShare =
    totalPoints > 0 && topBrandsCount > 0
      ? Math.round((topBrands.reduce((s, b) => s + b.count, 0) / totalPoints) * 100)
      : 0;
  
  const totalDynamics =
    regionStats?.brands.reduce((sum, b) => sum + getBrandDynamics(selectedRegion, b.brand, period), 0) ?? 0;

  // Разница с средним по стране
  const vsAvgSaturation = saturationIndex !== null ? Math.round((saturationIndex - COUNTRY_AVG.saturation) * 10) / 10 : null;
  const vsAvgTopShare = topShare > 0 ? Math.round(topShare - COUNTRY_AVG.topShare) : null;
  const vsAvgChainDensity = chainDensity !== null ? Math.round((chainDensity - COUNTRY_AVG.chainDensity) * 10) / 10 : null;
  const vsAvgGrowthRate = totalDynamics - COUNTRY_AVG.growthRate;

  // Процентные разницы для тултипа
  const percentDiffSaturation = saturationIndex !== null ? getPercentDiff(saturationIndex, COUNTRY_AVG.saturation) : "";
  const percentDiffTop = topShare > 0 ? getPercentDiff(topShare, COUNTRY_AVG.topShare) : "";
  const percentDiffChain = chainDensity !== null ? getPercentDiff(chainDensity, COUNTRY_AVG.chainDensity) : "";
  const percentDiffGrowth = getPercentDiff(totalDynamics, COUNTRY_AVG.growthRate);

  // Нормализация для РЕГИОНА
  const normalizedRegionSaturation = saturationIndex !== null 
    ? Math.min(saturationIndex / COUNTRY_MAX.saturation, 1)
    : 0;
  
  const invertedRegionSaturation = safeRound(1 - normalizedRegionSaturation);
  
  const normalizedRegionTop = topShare > 0 
    ? Math.min(topShare / COUNTRY_MAX.topShare, 1)
    : 0;
  
  const normalizedRegionChain = chainDensity !== null 
    ? Math.min(chainDensity / COUNTRY_MAX.chainDensity, 1)
    : 0;
  
  const normalizedRegionGrowth = totalDynamics !== 0
    ? Math.min(Math.abs(totalDynamics) / COUNTRY_MAX.growthRate, 1)
    : 0;

  // Нормализация для СРЕДНЕГО ПО СТРАНЕ
  const normalizedAvgSaturation = Math.min(COUNTRY_AVG.saturation / COUNTRY_MAX.saturation, 1);
  const invertedAvgSaturation = safeRound(1 - normalizedAvgSaturation);
  
  const normalizedAvgTop = Math.min(COUNTRY_AVG.topShare / COUNTRY_MAX.topShare, 1);
  const normalizedAvgChain = Math.min(COUNTRY_AVG.chainDensity / COUNTRY_MAX.chainDensity, 1);
  const normalizedAvgGrowth = Math.min(Math.abs(COUNTRY_AVG.growthRate) / COUNTRY_MAX.growthRate, 1);

  const radarData = [
    {
      subject: 'Saturation',
      region: invertedRegionSaturation,
      country: invertedAvgSaturation,
      originalRegion: saturationIndex,
      originalCountry: COUNTRY_AVG.saturation,
      percentDiff: percentDiffSaturation,
    },
    {
      subject: concentrationLabel,
      region: normalizedRegionTop,
      country: normalizedAvgTop,
      originalRegion: topShare,
      originalCountry: COUNTRY_AVG.topShare,
      percentDiff: percentDiffTop,
    },
    {
      subject: 'Chain Density',
      region: normalizedRegionChain,
      country: normalizedAvgChain,
      originalRegion: chainDensity,
      originalCountry: COUNTRY_AVG.chainDensity,
      percentDiff: percentDiffChain,
    },
    {
      subject: 'Growth Rate',
      region: normalizedRegionGrowth,
      country: normalizedAvgGrowth,
      originalRegion: totalDynamics,
      originalCountry: COUNTRY_AVG.growthRate,
      percentDiff: percentDiffGrowth,
    },
  ];

  return (
    <div className="flex flex-col h-full pb-2">

      {/* Header */}
      <Card className="px-4 py-3 flex items-start justify-between flex-shrink-0">
        <div>
          <h3 className="text-base font-bold text-gray-900 leading-tight">{selectedRegion}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Great Britain · Region detail</p>
        </div>
        <button
          onClick={onClearRegion}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </Card>

      {/* Geo stats */}
      <Card className="px-0 py-3 flex-shrink-0">
        <div className="flex items-stretch divide-x divide-gray-100">
          <div className="flex-1 px-3 min-w-0">
            <p className="text-[11px] text-gray-400 mb-0.5">Area</p>
            <p className="text-[13px] font-bold text-gray-700 leading-tight whitespace-nowrap">
              {area ? `${area.toLocaleString()} km²` : "—"}
            </p>
          </div>
          <div className="flex-1 px-3 min-w-0">
            <p className="text-[11px] text-gray-400 mb-0.5">Population</p>
            <p className="text-[13px] font-bold text-gray-700 leading-tight whitespace-nowrap">
              {population ? `${population}M` : "—"}
            </p>
          </div>
          <div className="flex-1 px-3 min-w-0">
            <p className="text-[11px] text-gray-400 mb-0.5">Density</p>
            <p className="text-[13px] font-bold text-gray-700 leading-tight whitespace-nowrap">
              {populationDensity ? `${populationDensity.toLocaleString()} /km²` : "—"}
            </p>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="mx-2 mt-2 flex flex-col gap-2 flex-shrink-0">
        {/* Первый ряд: Locations + концентрация */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Locations</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-blue-600 leading-none">{totalPoints}</p>
              {vsAvgTopShare !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg {vsAvgTopShare >= 0 ? "+" : ""}{vsAvgTopShare}
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{concentrationLabel}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-gray-900 leading-none">
                {totalPoints > 0 ? `${topShare}%` : "—"}
              </p>
              {vsAvgTopShare !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg {vsAvgTopShare >= 0 ? "+" : ""}{vsAvgTopShare}%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Второй ряд: Saturation Index + Chain Density */}
        <div className="grid grid-cols-2 gap-2">
          {/* Saturation Index — зеленый если ниже среднего */}
          <div className="relative group bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 cursor-help underline decoration-dotted decoration-gray-300">
              Saturation Index
            </p>
            <div className="pointer-events-none absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Locations per 100K population
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
            </div>
            <div className="flex items-end justify-between">
              <p className={`text-3xl font-black leading-none ${
                saturationIndex !== null && vsAvgSaturation !== null && vsAvgSaturation < 0
                  ? "text-emerald-500"
                  : "text-gray-900"
              }`}>
                {saturationIndex !== null ? saturationIndex : "—"}
              </p>
              {vsAvgSaturation !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg {vsAvgSaturation >= 0 ? "+" : ""}{vsAvgSaturation}
                </p>
              )}
            </div>
          </div>
          
          {/* Chain Density — красный если выше среднего */}
          <div className="relative group bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 cursor-help underline decoration-dotted decoration-gray-300">
              Chain Density
            </p>
            <div className="pointer-events-none absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Locations per 1000 km²
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
            </div>
            <div className="flex items-end justify-between">
              <p className={`text-3xl font-black leading-none ${
                chainDensity !== null && vsAvgChainDensity !== null && vsAvgChainDensity > 0
                  ? "text-red-500"
                  : "text-gray-900"
              }`}>
                {chainDensity !== null ? chainDensity : "—"}
              </p>
              {vsAvgChainDensity !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg {vsAvgChainDensity >= 0 ? "+" : ""}{vsAvgChainDensity}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Growth Rate Card */}
      <Card className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Growth Rate</p>
          <div className="flex items-center gap-0.5">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{ minWidth: 46 }}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors text-center ${
                  period === p ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {totalDynamics >= 0
              ? <TrendingUp className="w-5 h-5 text-emerald-500" />
              : <TrendingDown className="w-5 h-5 text-red-400" />}
            <span className={`text-2xl font-black leading-none ${totalDynamics >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {totalDynamics >= 0 ? "+" : ""}{totalDynamics}
            </span>
            <span className="text-[10px] text-gray-400">(exp.)</span>
          </div>
          
          {vsAvgGrowthRate !== null && (
            <p className="text-[9px] text-gray-400">
              vs Avg {vsAvgGrowthRate >= 0 ? "+" : ""}{vsAvgGrowthRate}
            </p>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="mx-2 mt-2 flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === "brands"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          onClick={() => setActiveTab("brands")}
        >
          Brands
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === "radar"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
          onClick={() => setActiveTab("radar")}
        >
          Region vs Country Avg
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "brands" ? (
        <Card className="flex-1 overflow-hidden flex flex-col mt-0">
          {regionStats && regionStats.totalPoints > 0 ? (
            <div className="px-4 py-3 space-y-2.5 overflow-y-auto h-full">
              {regionStats.brands.map((b) => {
                const dynamics = getBrandDynamics(selectedRegion, b.brand, period);
                return (
                  <div key={b.brand}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                      <span className="text-xs text-gray-700 flex-1 font-medium">{b.brand}</span>
                      <span className="text-xs font-bold text-gray-900 w-6 text-right tabular-nums">{b.count}</span>
                      <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{b.percent}%</span>
                      <span className={`text-[10px] font-semibold w-9 text-right tabular-nums ${dynamics >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                        {dynamics >= 0 ? "+" : ""}{dynamics}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${b.percent}%`, backgroundColor: b.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic px-4 py-3">No locations match current filters</p>
          )}
        </Card>
      ) : (
        <Card className="p-3 flex-1 flex flex-col mt-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Region vs Country Average</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 9 }} />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 1]} 
                  tick={{ fontSize: 8, formatter: (value) => `${Math.round(value * 100)}%` }}
                  allowDataOverflow={false}
                />
                
                <Radar
                  name="Country Avg"
                  dataKey="country"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="#9ca3af"
                  fillOpacity={0.1}
                />
                
                <Radar
                  name={selectedRegion}
                  dataKey="region"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="#3B82F6"
                  fillOpacity={0.4}
                />
                
                <Tooltip 
                  contentStyle={{ fontSize: '10px', padding: '4px 8px' }}
                  itemStyle={{ fontSize: '10px' }}
                  formatter={(value: number, name: string, props: any) => {
                    const payload = props.payload;
                    
                    if (name === "Country Avg") {
                      let formattedCountry = payload.originalCountry;
                      if (payload.subject === 'Top-3 share' || payload.subject === 'Top-2 share' || payload.subject === 'Top-1 share') {
                        formattedCountry = `${payload.originalCountry}%`;
                      } else if (payload.subject === 'Saturation' || payload.subject === 'Chain Density') {
                        formattedCountry = payload.originalCountry?.toFixed(1);
                      } else if (payload.subject === 'Growth Rate') {
                        formattedCountry = payload.originalCountry >= 0 ? `+${payload.originalCountry}` : `${payload.originalCountry}`;
                      }
                      
                      return [formattedCountry, "Country Avg"];
                    }
                    
                    const regionValue = payload.originalRegion;
                    const percentText = payload.percentDiff ? ` (${payload.percentDiff} vs Avg)` : '';
                    
                    let formattedRegion = regionValue;
                    if (payload.subject === 'Top-3 share' || payload.subject === 'Top-2 share' || payload.subject === 'Top-1 share') {
                      formattedRegion = `${regionValue}%`;
                    } else if (payload.subject === 'Saturation' || payload.subject === 'Chain Density') {
                      formattedRegion = regionValue?.toFixed(1);
                    } else if (payload.subject === 'Growth Rate') {
                      formattedRegion = regionValue >= 0 ? `+${regionValue}` : `${regionValue}`;
                    }
                    
                    return [`${formattedRegion}${percentText}`, selectedRegion];
                  }}
                  labelFormatter={(label) => label}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-[9px] text-gray-500">{selectedRegion}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span className="text-[9px] text-gray-500">Country Avg</span>
            </div>
          </div>
          <p className="text-[8px] text-gray-400 text-center mt-1">
            *Saturation inverted: 1 - (current/max). Larger area = higher potential
          </p>
        </Card>
      )}
    </div>
  );
};

export default RegionInfoPanel;
