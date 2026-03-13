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

const SIDEBAR_W = 264;

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

const Sep = () => <span className="text-gray-300 text-xs select-none">·</span>;

/** Chip with optional remove button and tooltip rendered above the bar */
const Chip = ({
  label, onRemove, tooltip,
}: { label: string; onRemove?: () => void; tooltip?: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100 cursor-default select-none whitespace-nowrap">
        {label}
        {onRemove && (
          <button onClick={onRemove} className="hover:text-blue-800 ml-0.5">
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </span>
      {/* Tooltip rendered above the topbar, never overlaps map */}
      {tooltip && show && (
        <div
          className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 text-gray-700 text-[10px] rounded-lg px-2.5 py-2 whitespace-pre-wrap shadow-md"
          style={{ zIndex: 9999, maxWidth: 200, minWidth: 120 }}
        >
          {tooltip}
          {/* small arrow */}
          <div className="absolute top-full left-4 w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 -translate-y-1" />
        </div>
      )}
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
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

  /** Select from dropdown — also triggers map fly */
  const handleSelectRegion = (r: string | null) => {
    setSelectedRegion(r);
    setRegionOpen(false);
    if (r) {
      // trigger flyTo; reset then set so same region re-triggers
      setFlyToRegion(null);
      setTimeout(() => setFlyToRegion(r), 10);
    } else {
      setFlyToRegion(null);
    }
  };

  /* ── Linked brand ↔ category logic ── */
  const handleToggleBrand = (brand: Brand) => {
    setSelectedBrands((prev) => {
      const next = prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand];
      setSelectedCategories((prevCats) => {
        let cats = [...prevCats];
        for (const cat of CATEGORIES) {
          const catBrands = CATEGORY_BRAND_MAP[cat];
          const anySelected = catBrands.some((b) => next.includes(b));
          const allSelected = catBrands.every((b) => next.includes(b));
          if (!anySelected && cats.includes(cat)) cats = cats.filter((c) => c !== cat);
          else if (allSelected && !cats.includes(cat)) cats = [...cats, cat];
        }
        return cats;
      });
      return next;
    });
  };

  const handleToggleCategory = (cat: Category) => {
    const catBrands = CATEGORY_BRAND_MAP[cat];
    setSelectedCategories((prev) => {
      const isRemoving = prev.includes(cat);
      if (isRemoving) {
        const otherCats = prev.filter((c) => c !== cat);
        const stillNeeded = new Set(otherCats.flatMap((c) => CATEGORY_BRAND_MAP[c]));
        setSelectedBrands((pb) => pb.filter((b) => !catBrands.includes(b) || stillNeeded.has(b)));
        return otherCats;
      } else {
        setSelectedBrands((pb) => [...new Set([...pb, ...catBrands])]);
        return [...prev, cat];
      }
    });
  };

  const handleSelectAllBrands = () => { setSelectedBrands([...BRANDS]); setSelectedCategories([...CATEGORIES]); };
  const handleDeselectAllBrands = () => { setSelectedBrands([]); setSelectedCategories([]); };
  const handleSelectAllCategories = () => { setSelectedCategories([...CATEGORIES]); setSelectedBrands([...BRANDS]); };
  const handleDeselectAllCategories = () => {
    setSelectedCategories([]);
    const allCatBrands = new Set(CATEGORIES.flatMap((c) => CATEGORY_BRAND_MAP[c]));
    setSelectedBrands((pb) => pb.filter((b) => !allCatBrands.has(b)));
  };

  const brandTooltip = selectedBrands.length > 0 ? selectedBrands.join("\n") : undefined;
  const catTooltip = selectedCategories.length > 0 ? selectedCategories.join("\n") : undefined;

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-white"
      onClick={() => { setCountryOpen(false); setRegionOpen(false); }}
    >
      {/* Navbar */}
      <nav className="w-12 flex-shrink-0 bg-[#1e2128] flex flex-col items-center py-3 gap-1" style={{ zIndex: 200, position: "relative" }}>
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

      {/* Content column */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR — above sidebar, z-index 150, overflow visible for tooltips */}
        <div
          className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-2 flex-shrink-0"
          style={{ zIndex: 150, position: "relative", overflow: "visible" }}
        >
          {/* Bigger title */}
          <span className="text-base font-bold text-blue-600 leading-none">Country Explorer</span>
          <span className="text-[11px] text-gray-400 font-medium ml-0.5">· Competitive Intelligence</span>
          <Sep />
          <Chip label="Great Britain" />
          <Sep />
          <Chip label={`${selectedBrands.length} brand${selectedBrands.length !== 1 ? "s" : ""}`} tooltip={brandTooltip} />
          <Sep />
          <Chip label={`${selectedCategories.length} categor${selectedCategories.length !== 1 ? "ies" : "y"}`} tooltip={catTooltip} />
          {selectedRegion && (
            <>
              <Sep />
              <Chip label={selectedRegion} onRemove={() => handleSelectRegion(null)} />
            </>
          )}
        </div>

        {/* Sidebar + map row */}
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

              {/* Country */}
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

              {/* Region — selecting here flies map */}
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
                  <input type="text" value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="Search brand..." className="text-xs bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400" />
                  {brandSearch && <button onClick={() => setBrandSearch("")}><X className="w-3 h-3 text-gray-400 hover:text-gray-600" /></button>}
                </div>
              </div>

              {/* Filters */}
              <div className="flex-1 overflow-y-auto mx-2 my-2">
                <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
                  <BrandFilters selectedBrands={selectedBrands} onToggleBrand={handleToggleBrand} onSelectAll={handleSelectAllBrands} onDeselectAll={handleDeselectAllBrands} searchQuery={brandSearch} />
                  <CategoryFilters selectedCategories={selectedCategories} onToggleCategory={handleToggleCategory} onSelectAll={handleSelectAllCategories} onDeselectAll={handleDeselectAllCategories} />
                </div>
              </div>
            </div>

            {/* Toggle button — right edge of sidebar */}
            <button
              onClick={(e) => { e.stopPropagation(); setFilterPanelOpen((v) => !v); }}
              style={{
                position: "absolute", right: "-18px", top: "50%", transform: "translateY(-50%)",
                width: "18px", height: "44px", background: "#e2e5ea", borderRadius: "0 8px 8px 0",
                border: "none", cursor: "pointer", zIndex: 500, display: "flex", alignItems: "center",
                justifyContent: "center", color: "#6b7280", boxShadow: "2px 0 6px rgba(0,0,0,0.07)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#c8cbd2"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e5ea"; }}
            >
              {filterPanelOpen ? <ChevronLeft style={{ width: 11, height: 11 }} /> : <ChevronRight style={{ width: 11, height: 11 }} />}
            </button>
          </aside>

          {/* Map */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              <RegionMap
                onRegionClick={setSelectedRegion}
                selectedRegion={selectedRegion}
                selectedBrands={selectedBrands}
                onRegionStats={handleRegionStats}
                flyToRegion={flyToRegion}
              />
              <InsightsPanel selectedRegion={selectedRegion} regionStats={regionStats} selectedBrands={selectedBrands} selectedCategories={selectedCategories} />
            </div>
          </div>

          {/* Right region panel */}
          {selectedRegion && (
            <aside className="flex-shrink-0 border-l border-[#d1d5db] bg-[#f0f2f5] flex flex-col overflow-y-auto" style={{ width: "316px", zIndex: 10 }}>
              <RegionInfoPanel selectedRegion={selectedRegion} regionStats={regionStats} onClearRegion={() => handleSelectRegion(null)} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
