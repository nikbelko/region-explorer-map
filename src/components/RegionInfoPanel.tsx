import { useState, useMemo } from "react";
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

// Расчет максимальных значений по стране для нормализации
const calculateCountryMax = () => {
  // В реальном приложении нужно передавать реальные максимумы по всем регионам
  return {
    saturation: 35, // Максимальная насыщенность (ресторанов на 100K)
    top3Share: 100, // Максимальная доля топ-3 (100%)
    chainDensity: 45, // Максимальная плотность сетей (ресторанов на 1000 км²)
    growthRate: 60 // Максимальный рост (в абсолютных цифрах)
  };
};

type TabType = "brands" | "radar";

// Функция для определения цвета vs Avg
const getVsAvgColor = (value: number | null, metric: string): string => {
  if (value === null) return "text-gray-400";
  
  // Для Saturation Index: отрицательное vs Avg = хорошо (рынок свободен) → зеленый
  if (metric === "saturation") {
    return value < 0 ? "text-emerald-500" : "text-red-400";
  }
  
  // Для остальных метрик: положительное vs Avg = хорошо → зеленый
  return value > 0 ? "text-emerald-500" : "text-red-400";
};

// Функция для расчета процентной разницы
const getPercentDiff = (value: number, avg: number): string => {
  if (avg === 0) return "";
  const diff = ((value - avg) / Math.abs(avg)) * 100;
  const roundedDiff = Math.round(diff * 10) / 10;
  return `${roundedDiff > 0 ? '+' : ''}${roundedDiff}%`;
};

const RegionInfoPanel = ({ selectedRegion, regionStats, onClearRegion }: RegionInfoPanelProps) => {
  const [period, setPeriod] = useState<Period>("quarter");
  const [activeTab, setActiveTab] = useState<TabType>("brands");

  if (!selectedRegion) return null;

  const population = getRegionPopulation(selectedRegion);
  const area = getRegionArea(selectedRegion);
  const populationDensity = population && area ? Math.round((population * 1_000_000) / area) : null;
  const totalPoints = regionStats?.totalPoints ?? 0;
  
  // Saturation Index — locations per 100K population
  const saturationIndex =
    population && population > 0
      ? Math.round((totalPoints / (population * 1_000_000)) * 100_000 * 10) / 10
      : null;
  
  // Chain Density — locations per 1000 km²
  const chainDensity =
    area && area > 0
      ? Math.round((totalPoints / area) * 1000 * 10) / 10
      : null;
  
  const top3Brands = regionStats?.brands.slice(0, 3) ?? [];
  const top3Share =
    totalPoints > 0 ? Math.round((top3Brands.reduce((s, b) => s + b.count, 0) / totalPoints) * 100) : 0;
  const totalDynamics =
    regionStats?.brands.reduce((sum, b) => sum + getBrandDynamics(selectedRegion, b.brand, period), 0) ?? 0;

  // Максимальные значения по стране для нормализации
  const countryMax = calculateCountryMax();
  
  // Средние значения для vs Avg (в реальном приложении нужно передавать)
  const countryAvg = {
    saturation: 12.5,
    top3Share: 65,
    chainDensity: 8.3,
    growthRate: 15
  };
  
  // Разница с средним по стране (для отображения vs Avg)
  const vsAvgSaturation = saturationIndex !== null ? Math.round((saturationIndex - countryAvg.saturation) * 10) / 10 : null;
  const vsAvgTop3Share = top3Share > 0 ? Math.round(top3Share - countryAvg.top3Share) : null;
  const vsAvgChainDensity = chainDensity !== null ? Math.round((chainDensity - countryAvg.chainDensity) * 10) / 10 : null;
  const vsAvgGrowthRate = totalDynamics - countryAvg.growthRate;

  // Процентные разницы для тултипа
  const percentDiffSaturation = saturationIndex !== null ? getPercentDiff(saturationIndex, countryAvg.saturation) : "";
  const percentDiffTop3 = top3Share > 0 ? getPercentDiff(top3Share, countryAvg.top3Share) : "";
  const percentDiffChain = chainDensity !== null ? getPercentDiff(chainDensity, countryAvg.chainDensity) : "";
  const percentDiffGrowth = getPercentDiff(totalDynamics, countryAvg.growthRate);

  // Нормализация по максимуму для РЕГИОНА (значения от 0 до 1)
  const normalizedRegionSaturation = saturationIndex !== null 
    ? saturationIndex / countryMax.saturation
    : 0;
  
  // Инвертированная насыщенность для оси Saturation (чем меньше, тем лучше)
  const invertedRegionSaturation = 1 - normalizedRegionSaturation;
  
  const normalizedRegionTop3 = top3Share / countryMax.top3Share;
  const normalizedRegionChain = chainDensity !== null 
    ? chainDensity / countryMax.chainDensity
    : 0;
  const normalizedRegionGrowth = Math.abs(totalDynamics) / countryMax.growthRate;

  // Нормализация по максимуму для СРЕДНЕГО ПО СТРАНЕ (те же правила)
  const normalizedAvgSaturation = countryAvg.saturation / countryMax.saturation;
  const invertedAvgSaturation = 1 - normalizedAvgSaturation;
  
  const normalizedAvgTop3 = countryAvg.top3Share / countryMax.top3Share;
  const normalizedAvgChain = countryAvg.chainDensity / countryMax.chainDensity;
  const normalizedAvgGrowth = Math.abs(countryAvg.growthRate) / countryMax.growthRate;

  // Данные для радарной диаграммы
  const radarData = [
    {
      subject: 'Saturation',
      region: invertedRegionSaturation,
      country: invertedAvgSaturation,
      originalRegion: saturationIndex,
      originalCountry: countryAvg.saturation,
      percentDiff: percentDiffSaturation,
      tooltipLabel: 'Saturation Index'
    },
    {
      subject: 'Top-3 Share',
      region: normalizedRegionTop3,
      country: normalizedAvgTop3,
      originalRegion: top3Share,
      originalCountry: countryAvg.top3Share,
      percentDiff: percentDiffTop3,
      tooltipLabel: 'Top-3 Share'
    },
    {
      subject: 'Chain Density',
      region: normalizedRegionChain,
      country: normalizedAvgChain,
      originalRegion: chainDensity,
      originalCountry: countryAvg.chainDensity,
      percentDiff: percentDiffChain,
      tooltipLabel: 'Chain Density'
    },
    {
      subject: 'Growth Rate',
      region: normalizedRegionGrowth,
      country: normalizedAvgGrowth,
      originalRegion: totalDynamics,
      originalCountry: countryAvg.growthRate,
      percentDiff: percentDiffGrowth,
      tooltipLabel: 'Growth Rate'
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

      {/* Geo stats — 3 columns with dividers */}
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

      {/* Metrics — два ряда по две метрики */}
      <div className="mx-2 mt-2 flex flex-col gap-2 flex-shrink-0">
        {/* Первый ряд: Locations + Top-3 share */}
        <div className="grid grid-cols-2 gap-2">
          {/* Locations — синее значение */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Locations</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-blue-600 leading-none">{totalPoints}</p>
              {vsAvgTop3Share !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg <span className={getVsAvgColor(vsAvgTop3Share, "top3")}>
                    {vsAvgTop3Share >= 0 ? "+" : ""}{vsAvgTop3Share}
                  </span>
                </p>
              )}
            </div>
          </div>
          
          {/* Top-3 share */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Top-3 share</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-gray-900 leading-none">
                {totalPoints > 0 ? `${top3Share}%` : "—"}
              </p>
              {vsAvgTop3Share !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg <span className={getVsAvgColor(vsAvgTop3Share, "top3")}>
                    {vsAvgTop3Share >= 0 ? "+" : ""}{vsAvgTop3Share}%
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Второй ряд: Saturation Index + Chain Density */}
        <div className="grid grid-cols-2 gap-2">
          {/* Saturation Index with tooltip */}
          <div className="relative group bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 cursor-help underline decoration-dotted decoration-gray-300">
              Saturation Index
            </p>
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Locations per 100K population
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-gray-900 leading-none">
                {saturationIndex !== null ? saturationIndex : "—"}
              </p>
              {vsAvgSaturation !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg <span className={getVsAvgColor(vsAvgSaturation, "saturation")}>
                    {vsAvgSaturation >= 0 ? "+" : ""}{vsAvgSaturation}
                  </span>
                </p>
              )}
            </div>
          </div>
          
          {/* Chain Density with tooltip */}
          <div className="relative group bg-white rounded-lg border border-[#e5e7eb] px-3 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 cursor-help underline decoration-dotted decoration-gray-300">
              Chain Density
            </p>
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Locations per 1000 km²
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-gray-900 leading-none">
                {chainDensity !== null ? chainDensity : "—"}
              </p>
              {vsAvgChainDensity !== null && (
                <p className="text-[9px] text-gray-400 mb-1">
                  vs Avg <span className={getVsAvgColor(vsAvgChainDensity, "chain")}>
                    {vsAvgChainDensity >= 0 ? "+" : ""}{vsAvgChainDensity}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Growth Rate Card с заголовком и переключателем внутри */}
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
          
          {/* vs Avg для Growth rate справа от значения */}
          {vsAvgGrowthRate !== null && (
            <p className="text-[9px] text-gray-400">
              vs Avg <span className={getVsAvgColor(vsAvgGrowthRate, "growth")}>
                {vsAvgGrowthRate >= 0 ? "+" : ""}{vsAvgGrowthRate}
              </span>
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
          Country Avg
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "brands" ? (
        /* Brand breakdown */
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
        /* Radar Chart */
        <Card className="p-3 flex-1 flex flex-col mt-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Region vs Country Average</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fontSize: 8, formatter: (value) => `${Math.round(value * 100)}%` }} />
                {/* Country Average — пунктирный контур, слабая заливка */}
                <Radar
                  name="Country Avg"
                  dataKey="country"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="#9ca3af"
                  fillOpacity={0.1}
                />
                {/* Region — яркая заливка */}
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
                    
                    // Для Country Avg показываем просто значение
                    if (name === "Country Avg") {
                      return [`Country Avg: ${payload.originalCountry}`, payload.tooltipLabel];
                    }
                    
                    // Для региона показываем значение с процентной разницей
                    const regionValue = payload.originalRegion;
                    const percentText = payload.percentDiff ? ` (${payload.percentDiff} vs Avg)` : '';
                    
                    // Форматируем значение в зависимости от типа метрики
                    let formattedValue = regionValue;
                    if (payload.subject === 'Top-3 Share') {
                      formattedValue = `${regionValue}%`;
                    } else if (payload.subject === 'Saturation' || payload.subject === 'Chain Density') {
                      formattedValue = regionValue?.toFixed(1);
                    }
                    
                    return [`${selectedRegion}: ${formattedValue}${percentText}`, payload.tooltipLabel];
                  }}
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
