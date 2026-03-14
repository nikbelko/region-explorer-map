import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Map, BarChart2, List, Star, Settings, LogOut,
  Search, ChevronLeft, ChevronRight, X, Download, Globe, Menu,
  TrendingUp, TrendingDown, Sparkles
} from "lucide-react";
import RegionMap from "@/components/RegionMap";
import BrandFilters from "@/components/BrandFilters";
import CategoryFilters, { Category, CATEGORIES, CATEGORY_BRAND_MAP } from "@/components/CategoryFilters";
import RegionInfoPanel from "@/components/RegionInfoPanel";
import InsightsPanel from "@/components/InsightsPanel";
import { Brand, BRANDS, RegionStats, BRAND_CONFIGS } from "@/data/regions";
import { getRegionPopulation, getRegionArea } from "@/data/regionPopulation";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";

/**
 * GeoJSON ITL125NM values include "(England)" suffix for English regions.
 * Map display name → exact GeoJSON value for flyTo and stats lookup.
 */
const DISPLAY_TO_GEO: Record<string, string> = {
  "East Midlands": "East Midlands (England)",
  "East of England": "East of England",
  "London": "London",
  "North East": "North East (England)",
  "North West": "North West (England)",
  "South East": "South East (England)",
  "South West": "South West (England)",
  "West Midlands": "West Midlands (England)",
  "Yorkshire and The Humber": "Yorkshire and The Humber",
  "Wales": "Wales",
  "Scotland": "Scotland",
  "Northern Ireland": "Northern Ireland"
};

const GEO_TO_DISPLAY: Record<string, string> = Object.fromEntries(
  Object.entries(DISPLAY_TO_GEO).map(([d, g]) => [g, d])
);

const DISPLAY_REGIONS = Object.keys(DISPLAY_TO_GEO);

const COUNTRIES = [
  { code: "GB", name: "Great Britain", active: true },
  { code: "DE", name: "Germany", active: false },
  { code: "FR", name: "France", active: false },
  { code: "NL", name: "Netherlands", active: false },
  { code: "US", name: "United States", active: false }
];

const SIDEBAR_W = 264;
const REGION_PANEL_W = 336;

// Максимальные значения для нормализации
const COUNTRY_MAX = {
  saturation: 35,
  chainDensity: 45,
  growthRate: 60
};

// Средние значения по стране
const COUNTRY_AVG = {
  saturation: 12.5,
  chainDensity: 8.3,
  growthRate: 15
};

// Функция для расчета статистики региона
const calculateRegionStats = (
  regionName: string,
  restaurants: any[],
  regionsGeoJson: any,
  selectedBrands: Brand[]
): RegionStats | null => {
  if (!regionsGeoJson || !restaurants.length) return null;

  // Находим нужный регион в GeoJSON
  const geoRegion = regionsGeoJson.features.find(
    (f: any) => f.properties?.ITL125NM === regionName
  );
  if (!geoRegion) return null;

  // Фильтруем рестораны по региону и выбранным брендам
  const pointsInRegion = restaurants.filter(r => {
    if (!selectedBrands.includes(r.brand)) return false;
    try {
      return booleanPointInPolygon(turfPoint([r.lng, r.lat]), geoRegion);
    } catch {
      return false;
    }
  });

  // Группируем по брендам
  const brandCounts: Record<string, number> = {};
  pointsInRegion.forEach(r => {
    brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;
  });

  const totalPoints = pointsInRegion.length;
  if (totalPoints === 0) return null;

  // Сортируем бренды по количеству
  const brands = Object.entries(brandCounts)
    .map(([brand, count]) => ({
      brand,
      count,
      percent: Math.round((count / totalPoints) * 100),
      color: BRAND_CONFIGS[brand as Brand]?.color || "#6b7280"
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPoints,
    brands
  };
};

// Функция для генерации случайных исторических данных для Sparkline
const generateSparklineData = (baseValue: number, volatility: number = 0.2): number[] => {
  const quarters = 4;
  const data: number[] = [];
  let current = baseValue;
  
  for (let i = 0; i < quarters; i++) {
    const change = (Math.random() - 0.5) * volatility * Math.abs(baseValue);
    current = current + change;
    data.push(Math.round(current * 10) / 10);
  }
  
  return data;
};

// Функция для расчета Attractiveness Score
const calculateAttractivenessScore = (
  saturation: number | null,
  density: number | null,
  growth: number
): number => {
  if (saturation === null || density === null) return 0;
  
  // Формула: (100 - насыщенность*4) + (100 - плотность*2) + (рост * 3)
  // Чем меньше насыщенность и плотность, тем выше score
  // Чем выше рост, тем выше score
  const saturationScore = Math.max(0, 100 - saturation * 4);
  const densityScore = Math.max(0, 100 - density * 2);
  const growthScore = Math.min(100, growth * 3);
  
  return Math.min(100, Math.round((saturationScore + densityScore + growthScore) / 3));
};

// Функция для получения цвета индикатора
const getIndicatorColor = (value: number | null, metric: string): string => {
  if (value === null) return "text-gray-400";
  
  if (metric === "saturation") {
    if (value < COUNTRY_AVG.saturation * 0.8) return "text-emerald-600";
    if (value < COUNTRY_AVG.saturation) return "text-emerald-500";
    if (value < COUNTRY_AVG.saturation * 1.2) return "text-yellow-500";
    return "text-red-500";
  }
  
  if (metric === "density") {
    if (value < COUNTRY_AVG.chainDensity * 0.8) return "text-emerald-600";
    if (value < COUNTRY_AVG.chainDensity) return "text-emerald-500";
    if (value < COUNTRY_AVG.chainDensity * 1.2) return "text-yellow-500";
    return "text-red-500";
  }
  
  if (metric === "growth") {
    if (value > COUNTRY_AVG.growthRate * 1.5) return "text-emerald-600";
    if (value > COUNTRY_AVG.growthRate) return "text-emerald-500";
    if (value > 0) return "text-yellow-500";
    return "text-red-500";
  }
  
  return "text-gray-900";
};

// Компонент Sparkline
const Sparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 40;
    const y = 16 - ((value - min) / range) * 12;
    return `${x},${y}`;
  }).join(' ');
  
  const trend = data[data.length - 1] - data[0];
  
  return (
    <div className="flex items-center gap-1">
      <svg width="40" height="16" viewBox="0 0 40 16" className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={trend >= 0 ? "#10b981" : "#ef4444"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-[9px] font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-400"}`}>
        {trend >= 0 ? "+" : ""}{Math.round(trend * 10) / 10}
      </span>
    </div>
  );
};

// ── Nav button ────────────────────────────────────────────────
const NavBtn = ({
  icon, label, active = false, onClick
}: {icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;}) => (
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

const Sep = () => <span className="text-gray-300 text-xs select-none mx-1.5">·</span>;

// Серый информационный чип (без крестика)
const InfoChip = ({ label }: {label: string;}) => (
  <span className="text-[11px] text-gray-400 font-light select-none whitespace-nowrap tracking-normal">{label}</span>
);

// Синий чип для выбранного региона
const RegionChip = ({ label, onRemove }: {label: string; onRemove: () => void;}) => (
  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100 select-none whitespace-nowrap">
    {label}
    <button onClick={onRemove} className="hover:text-blue-800 ml-0.5 flex-shrink-0">
      <X className="w-2.5 h-2.5" />
    </button>
  </span>
);

// Чип для Great Britain (как регион с крестиком)
const CountryChip = ({ label, onRemove }: {label: string; onRemove: () => void;}) => (
  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium border border-gray-200 select-none whitespace-nowrap">
    {label}
    <button onClick={onRemove} className="hover:text-gray-900 ml-0.5 flex-shrink-0">
      <X className="w-2.5 h-2.5" />
    </button>
  </span>
);

// ── Кнопка сворачивания панели ───────────────────────────────
const SidebarToggle = ({ isOpen, onClick }: {isOpen: boolean; onClick: () => void;}) => (
  <button
    onClick={onClick}
    className="absolute top-1/2 transform -translate-y-1/2 w-6 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-r-lg shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white transition-all z-[1000]"
    style={{
      left: isOpen ? '263px' : '-1px',
      transition: 'left 0.2s ease-in-out',
      backdropFilter: 'blur(4px)',
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
      pointerEvents: 'auto'
    }}
  >
    {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
  </button>
);

// ── Компонент выбора региона (поверх карты) ──────────────────
const RegionSelector = ({ isOpen, onClose, onSelectRegion, selectedRegion }: {
  isOpen: boolean;
  onClose: () => void;
  onSelectRegion: (region: string | null) => void;
  selectedRegion: string | null;
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 z-[1001]" 
        onClick={onClose}
      />
      
      <div 
        className="absolute top-12 left-1/2 transform -translate-x-1/2 w-64 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-blue-200 z-[1002] overflow-hidden"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div className="p-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs font-medium text-blue-700">Select region</span>
          <button onClick={onClose} className="text-blue-400 hover:text-blue-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="max-h-60 overflow-y-auto py-1">
          <div
            className={`flex items-center px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 transition-colors ${
              !selectedRegion ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
            }`}
            onClick={() => {
              onSelectRegion(null);
              onClose();
            }}
          >
            All regions
            {!selectedRegion && (
              <svg className="w-3 h-3 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          
          {DISPLAY_REGIONS.map((r) => (
            <div
              key={r}
              className={`flex items-center px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 transition-colors ${
                selectedRegion === r ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
              onClick={() => {
                onSelectRegion(r);
                onClose();
              }}
            >
              {r}
              {selectedRegion === r && (
                <svg className="w-3 h-3 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ── КОМПОНЕНТ RANKINGMODAL - С ПРЕДЗАГРУЖЕННЫМИ ДАННЫМИ ──
const RankingModal = ({ 
  isOpen, 
  onClose, 
  allRegionsStats,
  onSelectRegion 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  allRegionsStats: Record<string, RegionStats> | null;
  onSelectRegion: (region: string) => void;
}) => {
  const [sortField, setSortField] = useState<string>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Данные для таблицы уже предзагружены через allRegionsStats
  const regionData = useMemo(() => {
    if (!allRegionsStats) return [];
    
    return DISPLAY_REGIONS.map(region => {
      const stats = allRegionsStats[region];
      const population = getRegionPopulation(region);
      const area = getRegionArea(region);
      const totalPoints = stats?.totalPoints ?? 0;
      
      const saturation = population && population > 0
        ? Math.round((totalPoints / (population * 1_000_000)) * 100_000 * 10) / 10
        : null;
      
      const density = area && area > 0
        ? Math.round((totalPoints / area) * 1000 * 10) / 10
        : null;
      
      const top3Brands = stats?.brands.slice(0, 3) ?? [];
      const top3Share = totalPoints > 0
        ? Math.round((top3Brands.reduce((s, b) => s + b.count, 0) / totalPoints) * 100)
        : 0;
      
      // Используем случайный growth для демонстрации
      const growth = Math.round((Math.random() * 30 - 5) * 10) / 10;
      const score = calculateAttractivenessScore(saturation, density, growth);
      
      // Генерируем данные для sparkline
      const historicalGrowth = generateSparklineData(growth, 0.3);
      
      return {
        region,
        saturation,
        density,
        top3Share,
        growth,
        score,
        historicalGrowth
      };
    });
  }, [allRegionsStats]);

  // Сортировка данных
  const sortedData = useMemo(() => {
    if (!regionData.length) return [];
    
    return [...regionData].sort((a, b) => {
      if (sortField === "region") {
        const comparison = a.region.localeCompare(b.region);
        return sortDirection === "desc" ? -comparison : comparison;
      }
      
      const aVal = a[sortField as keyof typeof a] ?? 0;
      const bVal = b[sortField as keyof typeof b] ?? 0;
      
      const aNum = typeof aVal === 'number' ? aVal : 0;
      const bNum = typeof bVal === 'number' ? bVal : 0;
      
      return sortDirection === "desc" ? bNum - aNum : aNum - bNum;
    });
  }, [regionData, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExportCSV = () => {
    if (!sortedData.length) return;
    
    const headers = ["Region", "Saturation", "Density", "Top-3 Share", "Growth", "Score"];
    const rows = sortedData.map(d => [
      d.region,
      d.saturation?.toString() || "N/A",
      d.density?.toString() || "N/A",
      `${d.top3Share}%`,
      d.growth > 0 ? `+${d.growth}` : d.growth.toString(),
      d.score.toString()
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'region_ranking.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Затемнение фона */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000]" 
        onClick={onClose}
      />
      
      {/* Модальное окно */}
      <div 
        className="fixed inset-8 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl z-[2001] flex flex-col overflow-hidden border border-blue-100"
      >
        {/* Заголовок */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Regional Attractiveness Ranking</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {sortedData.length} regions
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Кнопка экспорта */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs">Export</span>
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10 min-w-[140px]">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => setExportMenuOpen(false)}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
            
            {/* Кнопка закрытия */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Таблица */}
        <div className="flex-1 overflow-auto p-4">
          {sortedData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">No data available</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b-2 border-gray-200">
                  {[
                    { key: 'region', label: 'Region' },
                    { key: 'saturation', label: 'Saturation (per 100k)' },
                    { key: 'density', label: 'Density (per km²)' },
                    { key: 'top3Share', label: 'Top-3 Share' },
                    { key: 'growth', label: 'Growth Trend' },
                    { key: 'score', label: 'Attractiveness Score' }
                  ].map(column => (
                    <th 
                      key={column.key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort(column.key)}
                    >
                      <div className="flex items-center gap-1">
                        {column.label}
                        {sortField === column.key && (
                          <span>{sortDirection === "desc" ? "↓" : "↑"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, index) => (
                  <tr 
                    key={row.region}
                    className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => onSelectRegion(row.region)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">#{index + 1}</span>
                        {row.region}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${getIndicatorColor(row.saturation, "saturation")}`}>
                        {row.saturation?.toFixed(1) || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${getIndicatorColor(row.density, "density")}`}>
                        {row.density?.toFixed(1) || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.top3Share}%</td>
                    <td className="px-4 py-3">
                      <Sparkline data={row.historicalGrowth} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${row.score}%` }}
                          />
                        </div>
                        <span className={`font-bold ${
                          row.score > 80 ? "text-emerald-600" : 
                          row.score > 60 ? "text-blue-600" : 
                          row.score > 40 ? "text-yellow-600" : 
                          "text-red-600"
                        }`}>
                          {row.score}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Подвал с информацией */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Low saturation / Low density (high potential)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>High saturation / High density (high competition)</span>
            </div>
          </div>
          <div>Click any row to focus region on map</div>
        </div>
      </div>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const { restaurants } = useRestaurantData();

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [flyToRegion, setFlyToRegion] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([...BRANDS]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...CATEGORIES]);
  const [regionStats, setRegionStats] = useState<RegionStats | null>(null);
  const [allRegionsStats, setAllRegionsStats] = useState<Record<string, RegionStats> | null>(null);
  const [regionsGeoJson, setRegionsGeoJson] = useState<any>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [countryOpen, setCountryOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);
  const [rankingModalOpen, setRankingModalOpen] = useState(false);

  // Загружаем GeoJSON при монтировании
  useEffect(() => {
    fetch("/data/uk-regions.geojson")
      .then((res) => res.json())
      .then((data) => {
        setRegionsGeoJson(data);
      })
      .catch((err) => console.error("Failed to load regions GeoJSON:", err));
  }, []);

  // Предзагружаем данные для всех регионов при изменении ресторанов или выбранных брендов
  useEffect(() => {
    if (!regionsGeoJson || !restaurants.length) return;

    const stats: Record<string, RegionStats> = {};
    
    // Для каждого отображаемого региона считаем статистику
    DISPLAY_REGIONS.forEach(region => {
      const geoName = DISPLAY_TO_GEO[region] || region;
      const regionStat = calculateRegionStats(geoName, restaurants, regionsGeoJson, selectedBrands);
      if (regionStat) {
        stats[region] = regionStat;
      }
    });

    setAllRegionsStats(stats);
  }, [regionsGeoJson, restaurants, selectedBrands]);

  const handleRegionStats = useCallback((stats: RegionStats | null) => {
    setRegionStats(stats);
    
    // Обновляем статистику для текущего региона в общем хранилище
    if (stats && selectedRegion) {
      setAllRegionsStats(prev => ({
        ...prev,
        [selectedRegion]: stats
      }));
    }
  }, [selectedRegion]);

  const handleSelectRegion = useCallback((displayName: string | null) => {
    setSelectedRegion(displayName);
    setRegionOpen(false);
    setRegionSelectorOpen(false);
    if (displayName) {
      const geoName = DISPLAY_TO_GEO[displayName] ?? displayName;
      setFlyToRegion(null);
      setTimeout(() => setFlyToRegion(geoName), 10);
    } else {
      setFlyToRegion(null);
    }
  }, []);

  const handleMapRegionClick = useCallback((geoName: string) => {
    const display = GEO_TO_DISPLAY[geoName] ?? geoName;
    setSelectedRegion(display);
    const geo = DISPLAY_TO_GEO[display] ?? geoName;
    setFlyToRegion(null);
    setTimeout(() => setFlyToRegion(geo), 10);
  }, []);

  const handleToggleBrand = useCallback((brand: Brand) => {
    setSelectedBrands((prev) => {
      const next = prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand];
      const nextCats: Category[] = CATEGORIES.filter((cat) =>
        CATEGORY_BRAND_MAP[cat].some((b) => next.includes(b))
      );
      setTimeout(() => setSelectedCategories(nextCats), 0);
      return next;
    });
  }, []);

  const handleToggleCategory = useCallback((cat: Category) => {
    const catBrands = CATEGORY_BRAND_MAP[cat];
    setSelectedCategories((prev) => {
      const removing = prev.includes(cat);
      const nextCats = removing ? prev.filter((c) => c !== cat) : [...prev, cat];
      const needed = new Set(nextCats.flatMap((c) => CATEGORY_BRAND_MAP[c]));
      if (removing) {
        setTimeout(() => setSelectedBrands((pb) => pb.filter((b) => !catBrands.includes(b) || needed.has(b))), 0);
      } else {
        setTimeout(() => setSelectedBrands((pb) => [...new Set([...pb, ...catBrands])]), 0);
      }
      return nextCats;
    });
  }, []);

  const handleSelectAllBrands = useCallback(() => {
    setSelectedBrands([...BRANDS]);
    setSelectedCategories([...CATEGORIES]);
  }, []);

  const handleDeselectAllBrands = useCallback(() => {
    setSelectedBrands([]);
    setSelectedCategories([]);
  }, []);

  const handleSelectAllCategories = useCallback(() => {
    setSelectedCategories([...CATEGORIES]);
    setSelectedBrands([...BRANDS]);
  }, []);

  const handleDeselectAllCategories = useCallback(() => {
    setSelectedCategories([]);
    const allCatBrands = new Set(CATEGORIES.flatMap((c) => CATEGORY_BRAND_MAP[c]));
    setSelectedBrands((pb) => pb.filter((b) => !allCatBrands.has(b)));
  }, []);

  const selectedRegionGeo = selectedRegion ? (DISPLAY_TO_GEO[selectedRegion] ?? selectedRegion) : null;
  const regionPanelOpen = selectedRegion !== null;

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-white"
      onClick={() => { setCountryOpen(false); setRegionOpen(false); }}
    >
      {/* ── Navbar ── */}
      <nav
        className="w-12 flex-shrink-0 bg-[#1e2128] flex flex-col items-center py-3 gap-1"
        style={{ zIndex: 200, position: "relative" }}
      >
        <div className="w-8 h-8 mb-4 flex items-center justify-center">
          <svg viewBox="0 0 107.57 137.26" className="w-5 h-5" fill="#9a9d9e">
            <path d="M77,60.2c17.98,6.17,31.89-14.53,21.26-30.29C89.01,16.2,73.41,7.2,55.72,7.2C27.33,7.2,4.31,30.4,4.31,59.03c0,33.56,38.08,63.1,48.7,70.68c1.65,1.18,3.78,1.18,5.43,0c5.79-4.13,19.74-14.8,31.24-29.08c8.85-11,3.92-26.29-8.16-33.59c-7.96-4.81-19.96-4.13-23.53,4.45c-1.76,4.23-1.72,8.9,2.87,13.5C71.27,95.39,40.3,98.85,40.3,74.58c0-19.82,21.52-22.05,28.92-17.89C71.88,58.18,74.48,59.33,77,60.2z" />
          </svg>
        </div>
        <NavBtn icon={<Map className="w-4 h-4" />} label="Country Explorer" active />
        <NavBtn icon={<BarChart2 className="w-4 h-4" />} label="Compare brands" onClick={() => navigate("/compare")} />
        <NavBtn icon={<List className="w-4 h-4" />} label="Chains list" />
        <NavBtn icon={<Star className="w-4 h-4" />} label="Saved" />
        <div className="flex-1" />
        <NavBtn icon={<Download className="w-4 h-4" />} label="Export data" />
        <NavBtn icon={<Settings className="w-4 h-4" />} label="Settings" />
        <NavBtn icon={<LogOut className="w-4 h-4" />} label="Log out" />
      </nav>

      {/* ── Content column ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <div
          className="bg-white border-b border-gray-200 flex items-center px-4 gap-1 flex-shrink-0"
          style={{ zIndex: 150, position: "relative", overflow: "visible", height: 48 }}
        >
          <span className="text-base font-bold text-blue-600 leading-none flex items-center pt-0 pb-[3px]">Country Explorer</span>
          <Sep />
          <span className="text-[11px] text-gray-400 font-light flex items-center">Competitive Intelligence</span>
          <Sep />
          <CountryChip label="Great Britain" onRemove={() => console.log("Remove country")} />
          <Sep />
          <InfoChip label={`${selectedBrands.length} brand${selectedBrands.length !== 1 ? 's' : ''}`} />
          <Sep />
          <InfoChip label={`${selectedCategories.length} categor${selectedCategories.length !== 1 ? 'ies' : 'y'}`} />
          
          {/* Кнопка выбора региона (список) */}
          <button
            onClick={(e) => { e.stopPropagation(); setRegionSelectorOpen(true); }}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100 hover:bg-blue-100 transition-colors ml-1"
          >
            <Menu className="w-3 h-3" />
            <span>{selectedRegion ?? "All regions"}</span>
          </button>
          
          {selectedRegion && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleSelectRegion(null); }}
                className="text-blue-400 hover:text-blue-600 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          )}

          {/* Кнопка Show Full Ranking */}
          <button
            onClick={() => setRankingModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Show Full Ranking
          </button>
        </div>

        {/* ── Sidebar + map + right panel ── */}
        <div className="flex-1 flex relative overflow-hidden">

          {/* Sidebar */}
          <aside
            style={{
              width: filterPanelOpen ? `${SIDEBAR_W}px` : "0px",
              flexShrink: 0,
              background: "#f0f2f5",
              borderRight: filterPanelOpen ? "1px solid #d1d5db" : "none",
              zIndex: 10,
              transition: "width 0.2s ease-in-out",
              overflow: "hidden",
              position: "relative"
            }}
          >
            <div style={{ width: `${SIDEBAR_W}px` }} className="flex flex-col h-full">
              {/* Country selector */}
              <div className="px-3 pt-3 pb-2 border-b border-[#d1d5db]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 px-1">Country</p>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setCountryOpen((v) => !v); setRegionOpen(false); }}
                    className="flex items-center gap-2 bg-white border border-[#d1d5db] rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors w-full"
                  >
                    <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-left">Great Britain</span>
                    <ChevronRight className="w-3 h-3 text-gray-400" style={{ transform: countryOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.15s" }} />
                  </button>
                  {countryOpen && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#d1d5db] rounded-md shadow-md overflow-hidden" style={{ zIndex: 50 }}>
                      {COUNTRIES.map((c) => (
                        <div
                          key={c.code}
                          className={`flex items-center gap-2 px-3 py-2 text-xs border-b border-gray-50 last:border-0 ${c.active ? "cursor-pointer hover:bg-blue-50 text-gray-800 font-medium" : "cursor-not-allowed text-gray-300"}`}
                          onClick={() => c.active && setCountryOpen(false)}
                        >
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          {c.name}
                          {!c.active && <span className="ml-auto text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>}
                          {c.active && <svg className="w-3 h-3 text-blue-600 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Region selector */}
              <div className="px-3 py-2 border-b border-[#d1d5db]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 px-1">Region</p>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setRegionOpen((v) => !v); setCountryOpen(false); }}
                    className="flex items-center gap-2 bg-white border border-[#d1d5db] rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors w-full"
                  >
                    <span className="flex-1 text-left truncate">{selectedRegion ?? "All regions"}</span>
                    {selectedRegion && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectRegion(null); }}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" style={{ transform: regionOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.15s" }} />
                  </button>
                  {regionOpen && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#d1d5db] rounded-md shadow-md overflow-hidden max-h-52 overflow-y-auto" style={{ zIndex: 50 }}>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 text-xs border-b border-gray-50 cursor-pointer hover:bg-blue-50 ${!selectedRegion ? "text-blue-700 font-medium bg-blue-50/40" : "text-gray-600"}`}
                        onClick={() => handleSelectRegion(null)}
                      >
                        All regions
                        {!selectedRegion && <svg className="w-3 h-3 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </div>
                      {DISPLAY_REGIONS.map((r) => (
                        <div
                          key={r}
                          className={`flex items-center px-3 py-2 text-xs border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50 ${selectedRegion === r ? "text-blue-700 font-medium bg-blue-50/60" : "text-gray-700"}`}
                          onClick={() => handleSelectRegion(r)}
                        >
                          {r}
                          {selectedRegion === r && <svg className="w-3 h-3 text-blue-600 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b border-[#d1d5db]">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-md border border-[#d1d5db]">
                  <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Search brand..."
                    className="text-xs bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400"
                  />
                  {brandSearch && (
                    <button onClick={() => setBrandSearch("")}>
                      <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex-1 overflow-y-auto mx-2 my-2">
                <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
                  <BrandFilters
                    selectedBrands={selectedBrands}
                    onToggleBrand={handleToggleBrand}
                    onSelectAll={handleSelectAllBrands}
                    onDeselectAll={handleDeselectAllBrands}
                    searchQuery={brandSearch}
                  />
                  <CategoryFilters
                    selectedCategories={selectedCategories}
                    onToggleCategory={handleToggleCategory}
                    onSelectAll={handleSelectAllCategories}
                    onDeselectAll={handleDeselectAllCategories}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Кнопка сворачивания панели */}
          <SidebarToggle isOpen={filterPanelOpen} onClick={() => setFilterPanelOpen(!filterPanelOpen)} />

          {/* Map */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              <RegionMap
                onRegionClick={handleMapRegionClick}
                selectedRegion={selectedRegionGeo}
                selectedBrands={selectedBrands}
                onRegionStats={handleRegionStats}
                flyToRegion={flyToRegion}
                regionPanelWidth={regionPanelOpen ? REGION_PANEL_W : 0}
              />
              
              <InsightsPanel
                selectedRegion={selectedRegion}
                regionStats={regionStats}
                selectedBrands={selectedBrands}
                selectedCategories={selectedCategories}
              />

              {/* Попап выбора региона */}
              <RegionSelector
                isOpen={regionSelectorOpen}
                onClose={() => setRegionSelectorOpen(false)}
                onSelectRegion={handleSelectRegion}
                selectedRegion={selectedRegion}
              />

              {/* Модальное окно с рейтингом */}
              <RankingModal
                isOpen={rankingModalOpen}
                onClose={() => setRankingModalOpen(false)}
                allRegionsStats={allRegionsStats}
                onSelectRegion={(region) => {
                  handleSelectRegion(region);
                }}
              />
            </div>
          </div>

          {/* Right region panel */}
          {regionPanelOpen && (
            <aside
              className="flex-shrink-0 border-l border-[#d1d5db] bg-[#f0f2f5] flex flex-col overflow-y-auto"
              style={{ width: `${REGION_PANEL_W}px`, zIndex: 10 }}
            >
              <RegionInfoPanel
                selectedRegion={selectedRegion}
                regionStats={regionStats}
                onClearRegion={() => handleSelectRegion(null)}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
