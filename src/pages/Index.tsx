import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Map, BarChart2, List, Star, Settings, LogOut,
  Search, ChevronLeft, ChevronRight, X, Download, Globe
} from "lucide-react";
import RegionMap from "@/components/RegionMap";
import BrandFilters from "@/components/BrandFilters";
import CategoryFilters, { Category, CATEGORIES, CATEGORY_BRAND_MAP } from "@/components/CategoryFilters";
import RegionInfoPanel from "@/components/RegionInfoPanel";
import InsightsPanel from "@/components/InsightsPanel";
import { Brand, BRANDS, RegionStats } from "@/data/regions";

/**
 * GeoJSON ITL125NM values include "(England)" suffix for English regions.
 * Map display name → exact GeoJSON value for flyTo and stats lookup.
 */
const DISPLAY_TO_GEO: Record<string, string> = {
  "East Midlands":            "East Midlands (England)",
  "East of England":          "East of England",
  "London":                   "London",
  "North East":               "North East (England)",
  "North West":               "North West (England)",
  "South East":               "South East (England)",
  "South West":               "South West (England)",
  "West Midlands":            "West Midlands (England)",
  "Yorkshire and The Humber": "Yorkshire and The Humber",
  "Wales":                    "Wales",
  "Scotland":                 "Scotland",
  "Northern Ireland":         "Northern Ireland",
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
  { code: "US", name: "United States", active: false },
];

const SIDEBAR_W = 264;
const REGION_PANEL_W = 336; // slightly wider so km² doesn't wrap

// ── Nav button ────────────────────────────────────────────────
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

const Sep = () => <span className="text-gray-300 text-xs select-none mx-0.5">·</span>;

// Обычный серый чип — без жирного шрифта
const InfoChip = ({ label }: { label: string }) => (
  <span className="text-xs text-gray-400 font-normal select-none whitespace-nowrap">{label}</span>
);

// Синий чип для выбранного региона
const RegionChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100 select-none whitespace-nowrap">
    {label}
    <button onClick={onRemove} className="hover:text-blue-800 ml-0.5 flex-shrink-0">
      <X className="w-2.5 h-2.5" />
    </button>
  </span>
);

// ── Кнопка сворачивания панели ───────────────────────────────
const SidebarToggle = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-12 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-r-lg shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white/90 transition-all z-50"
    style={{ backdropFilter: "blur(4px)" }}
  >
    {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
  </button>
);

// ── Main page ─────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();

  // selectedRegion is the SHORT display name; geo name used for map
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [flyToRegion, setFlyToRegion] = useState<string | null>(null);

  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([...BRANDS]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...CATEGORIES]);
  const [regionStats, setRegionStats] = useState<RegionStats | null>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [countryOpen, setCountryOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  const handleRegionStats = useCallback((stats: RegionStats | null) => {
    setRegionStats(stats);
  }, []);

  // Select by short display name → convert to geo name for flyTo
  const handleSelectRegion = useCallback((displayName: string | null) => {
    setSelectedRegion(displayName);
    setRegionOpen(false);
    if (displayName) {
      const geoName = DISPLAY_TO_GEO[displayName] ?? displayName;
      setFlyToRegion(null);
      setTimeout(() => setFlyToRegion(geoName), 10);
    } else {
      setFlyToRegion(null);
    }
  }, []);

  // Map click emits geo name → convert to display name
  const handleMapRegionClick = useCallback((geoName: string) => {
    const display = GEO_TO_DISPLAY[geoName] ?? geoName;
    setSelectedRegion(display);
    const geo = DISPLAY_TO_GEO[display] ?? geoName;
    setFlyToRegion(null);
    setTimeout(() => setFlyToRegion(geo), 10);
  }, []);

  // ── Linked brand ↔ category — no nested setState ──────────
  const handleToggleBrand = useCallback((brand: Brand) => {
    setSelectedBrands((prev) => {
      const next = prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand];
      const nextCats: Category[] = CATEGORIES.filter((cat) =>
        CATEGORY_BRAND_MAP[cat].some((b) => next.includes(b))
      );
      // schedule separately to avoid batching issues
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

  // Pass GEO name to RegionMap
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

        {/* TOP BAR — все элементы не жирные */}
        <div
          className="bg-white border-b border-gray-200 flex items-center px-4 gap-1.5 flex-shrink-0"
          style={{ zIndex: 150, position: "relative", overflow: "visible", height: 44, paddingBottom: 2 }}
        >
          <span className="text-base font-bold text-blue-600 leading-none">Country Explorer</span>
          <span className="text-[11px] text-gray-400 font-normal ml-0.5">· Competitive Intelligence</span>
          <Sep />
          <InfoChip label="Great Britain" />
          <Sep />
          <InfoChip label={`${selectedBrands.length} brand${selectedBrands.length !== 1 ? "s" : ""}`} />
          <Sep />
          <InfoChip label={`${selectedCategories.length} categor${selectedCategories.length !== 1 ? "ies" : "y"}`} />
          {selectedRegion && (
            <>
              <Sep />
              <RegionChip label={selectedRegion} onRemove={() => handleSelectRegion(null)} />
            </>
          )}
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
              transition: "width 0.2s ease",
              overflow: "hidden",
              position: "relative",
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

              {/* Region selector — short display names, maps to geo names */}
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

          {/* Кнопка сворачивания панели — поверх карты */}
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
