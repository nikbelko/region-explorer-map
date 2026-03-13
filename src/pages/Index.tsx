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

const ENGLAND_REGIONS = [
  "East Midlands", "East of England", "London", "North East", "North West",
  "South East", "South West", "West Midlands", "Yorkshire and The Humber",
  "Wales", "Scotland", "Northern Ireland",
];

const COUNTRIES = [
  { code: "GB", name: "Great Britain", active: true },
  { code: "DE", name: "Germany", active: false },
  { code: "FR", name: "France", active: false },
  { code: "NL", name: "Netherlands", active: false },
  { code: "US", name: "United States", active: false },
];

const NavBtn = ({
  icon, label, active = false, onClick,
}: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;
}) => (
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

const Index = () => {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([...BRANDS]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...CATEGORIES]);
  const [regionStats, setRegionStats] = useState<RegionStats | null>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [countryOpen, setCountryOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  const handleToggleBrand = (brand: Brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleToggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const isRemoving = prev.includes(cat);
      const newCategories = isRemoving ? prev.filter((c) => c !== cat) : [...prev, cat];
      const brandsForCat = CATEGORY_BRAND_MAP[cat];
      if (isRemoving) {
        const brandsStillNeeded = new Set(newCategories.flatMap((c) => CATEGORY_BRAND_MAP[c]));
        setSelectedBrands((prev) =>
          prev.filter((b) => !brandsForCat.includes(b) || brandsStillNeeded.has(b))
        );
      } else {
        setSelectedBrands((prev) => [...new Set([...prev, ...brandsForCat])]);
      }
      return newCategories;
    });
  };

  const handleRegionStats = useCallback((stats: RegionStats | null) => {
    setRegionStats(stats);
  }, []);

  const handleSelectRegion = (r: string | null) => {
    setSelectedRegion(r);
    setRegionOpen(false);
  };

  const SIDEBAR_W = 264;

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-white"
      onClick={() => { setCountryOpen(false); setRegionOpen(false); }}
    >
      {/* ── Navbar ── */}
      <nav
        className="w-12 flex-shrink-0 bg-[#1e2128] flex flex-col items-center py-3 gap-1"
        style={{ zIndex: 9998, position: "relative" }}
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

      {/* ── Layout wrapper ── */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* ── Sidebar — overflow visible so toggle can poke out ── */}
        <aside
          style={{
            width: filterPanelOpen ? `${SIDEBAR_W}px` : "0px",
            flexShrink: 0,
            background: "#f0f2f5",
            borderRight: filterPanelOpen ? "1px solid #d1d5db" : "none",
            zIndex: 10,
            transition: "width 0.2s ease",
            overflow: "hidden",
            position: "relative",   /* so the toggle inside it is relative to sidebar edge */
          }}
        >
          <div style={{ width: `${SIDEBAR_W}px` }} className="flex flex-col h-full">

            {/* Competitive Intelligence label */}
            <div className="px-4 pt-3 pb-2 border-b border-[#d1d5db]">
              <p className="text-[11px] font-semibold text-gray-500 tracking-wide">Competitive Intelligence</p>
            </div>

            {/* Country */}
            <div className="px-3 pt-2 pb-2 border-b border-[#d1d5db]">
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

            {/* Region */}
            <div className="px-3 py-2 border-b border-[#d1d5db]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 px-1">Region</p>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setRegionOpen((v) => !v); setCountryOpen(false); }}
                  className="flex items-center gap-2 bg-white border border-[#d1d5db] rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors w-full"
                >
                  <span className="flex-1 text-left">{selectedRegion ?? "All regions"}</span>
                  {selectedRegion && (
                    <button onClick={(e) => { e.stopPropagation(); handleSelectRegion(null); }} className="text-gray-400 hover:text-gray-600">
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
                    {ENGLAND_REGIONS.map((r) => (
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
                  placeholder="Search chain..."
                  className="text-xs bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400"
                />
                {brandSearch && <button onClick={() => setBrandSearch("")}><X className="w-3 h-3 text-gray-400 hover:text-gray-600" /></button>}
              </div>
            </div>

            {/* Filters */}
            <div className="flex-1 overflow-y-auto mx-2 my-2">
              <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
                <BrandFilters
                  selectedBrands={selectedBrands}
                  onToggleBrand={handleToggleBrand}
                  onSelectAll={() => setSelectedBrands([...BRANDS])}
                  onDeselectAll={() => setSelectedBrands([])}
                  searchQuery={brandSearch}
                />
                <CategoryFilters
                  selectedCategories={selectedCategories}
                  onToggleCategory={handleToggleCategory}
                  onSelectAll={() => {
                    setSelectedCategories([...CATEGORIES]);
                    const allBrands = new Set(CATEGORIES.flatMap((c) => CATEGORY_BRAND_MAP[c]));
                    setSelectedBrands((prev) => [...new Set([...prev, ...allBrands])]);
                  }}
                  onDeselectAll={() => {
                    setSelectedCategories([]);
                    const allCatBrands = new Set(CATEGORIES.flatMap((c) => CATEGORY_BRAND_MAP[c]));
                    setSelectedBrands((prev) => prev.filter((b) => !allCatBrands.has(b)));
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Toggle button — absolute, anchored to RIGHT edge of sidebar ── */}
          <button
            onClick={(e) => { e.stopPropagation(); setFilterPanelOpen((v) => !v); }}
            title={filterPanelOpen ? "Hide filters" : "Show filters"}
            style={{
              position: "absolute",
              right: "-18px",       /* pokes out 18px beyond sidebar right edge */
              top: "50%",
              transform: "translateY(-50%)",
              width: "18px",
              height: "44px",
              background: "#e2e5ea",
              borderRadius: "0 8px 8px 0",
              border: "none",
              cursor: "pointer",
              zIndex: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              boxShadow: "2px 0 6px rgba(0,0,0,0.07)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#c8cbd2"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e5ea"; }}
          >
            {filterPanelOpen
              ? <ChevronLeft style={{ width: 11, height: 11 }} />
              : <ChevronRight style={{ width: 11, height: 11 }} />
            }
          </button>
        </aside>

        {/* ── Map area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-2 z-10 flex-shrink-0">
            {/* Blue "Country Explorer" label */}
            <span className="text-sm font-bold text-blue-600">Country Explorer</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">Great Britain</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">{selectedBrands.length} chains</span>
            {selectedRegion && (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100">
                  {selectedRegion}
                  <button onClick={() => handleSelectRegion(null)} className="hover:text-blue-800 ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              </>
            )}
          </div>

          <div className="flex-1 relative">
            <RegionMap
              onRegionClick={setSelectedRegion}
              selectedRegion={selectedRegion}
              selectedBrands={selectedBrands}
              onRegionStats={handleRegionStats}
            />
            <InsightsPanel
              selectedRegion={selectedRegion}
              regionStats={regionStats}
              selectedBrands={selectedBrands}
              selectedCategories={selectedCategories}
            />
          </div>
        </div>

        {/* ── Right region panel ── */}
        {selectedRegion && (
          <aside
            className="flex-shrink-0 border-l border-[#d1d5db] bg-[#f0f2f5] flex flex-col overflow-y-auto"
            style={{ width: "300px", zIndex: 10 }}
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
  );
};

export default Index;
