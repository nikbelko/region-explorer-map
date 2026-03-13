import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitCompare, Map, BarChart2, List, Star, Settings, LogOut,
  Search, ChevronRight, ChevronLeft, X, Download, Globe
} from "lucide-react";
import RegionMap from "@/components/RegionMap";
import BrandFilters from "@/components/BrandFilters";
import CategoryFilters, { Category, CATEGORIES, CATEGORY_BRAND_MAP } from "@/components/CategoryFilters";
import RegionInfoPanel from "@/components/RegionInfoPanel";
import InsightsPanel from "@/components/InsightsPanel";
import { Brand, BRANDS, RegionStats } from "@/data/regions";

const Index = () => {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([...BRANDS]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...CATEGORIES]);
  const [regionStats, setRegionStats] = useState<RegionStats | null>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">

      {/* ── Left icon navbar ── */}
      <nav className="w-12 flex-shrink-0 bg-[#1e2128] flex flex-col items-center py-3 gap-1 z-20">
        {/* Logo */}
        <div className="w-8 h-8 mb-4 flex items-center justify-center">
          <svg viewBox="0 0 107.57 137.26" className="w-5 h-5" fill="#9a9d9e">
            <path d="M77,60.2c17.98,6.17,31.89-14.53,21.26-30.29C89.01,16.2,73.41,7.2,55.72,7.2C27.33,7.2,4.31,30.4,4.31,59.03c0,33.56,38.08,63.1,48.7,70.68c1.65,1.18,3.78,1.18,5.43,0c5.79-4.13,19.74-14.8,31.24-29.08c8.85-11,3.92-26.29-8.16-33.59c-7.96-4.81-19.96-4.13-23.53,4.45c-1.76,4.23-1.72,8.9,2.87,13.5C71.27,95.39,40.3,98.85,40.3,74.58c0-19.82,21.52-22.05,28.92-17.89C71.88,58.18,74.48,59.33,77,60.2z" />
          </svg>
        </div>

        {/* Country Explorer — active */}
        <button
          title="Country Explorer"
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2d3139] text-white"
        >
          <Map className="w-4 h-4" />
        </button>

        {/* Compare */}
        <button
          title="Compare brands"
          onClick={() => navigate("/compare")}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
        </button>

        {/* Chains list */}
        <button
          title="Chains list"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Saved */}
        <button
          title="Saved"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors"
        >
          <Star className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Export */}
        <button
          title="Export data"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d3139] transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          title="Settings"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Logout */}
        <button
          title="Logout"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </nav>

      {/* ── Filter sidebar (collapsible) ── */}
      <aside
        className="flex-shrink-0 border-r border-[#d1d5db] bg-[#f0f2f5] flex flex-col transition-all duration-200 overflow-hidden"
        style={{ width: filterPanelOpen ? "260px" : "0px" }}
      >
        <div className="w-[260px] flex flex-col h-full">

          {/* Header: breadcrumb + country selector */}
          <div className="px-4 py-3 border-b border-[#d1d5db]">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2.5">
              <Globe className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-600">Great Britain</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-medium text-gray-700">England</span>
            </div>

            {/* Country selector pill */}
            <button className="flex items-center gap-2 bg-white border border-[#d1d5db] rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors w-full mb-2.5">
              <Globe className="w-3 h-3 text-gray-400" />
              <span className="flex-1 text-left">England</span>
              <ChevronRight className="w-3 h-3 text-gray-400 rotate-90" />
            </button>

            {/* Action buttons row */}
            <div className="flex gap-1.5">
              {/* Country Explorer — active */}
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white flex-shrink-0">
                <Map className="w-3 h-3" />
                Explorer
              </span>

              {/* Compare */}
              <button
                onClick={() => navigate("/compare")}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-[#d1d5db] text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors flex-shrink-0"
              >
                <GitCompare className="w-3 h-3" />
                Compare
              </button>

              {/* Export */}
              <button
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-[#d1d5db] text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors flex-shrink-0"
                title="Export data"
              >
                <Download className="w-3 h-3" />
              </button>
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
              {brandSearch && (
                <button onClick={() => setBrandSearch("")}>
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Filter lists — white card */}
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
      </aside>

      {/* ── Collapse toggle button ── */}
      <button
        onClick={() => setFilterPanelOpen((v) => !v)}
        title={filterPanelOpen ? "Hide filters" : "Show filters"}
        className="flex-shrink-0 w-4 bg-[#f0f2f5] border-r border-[#d1d5db] flex items-center justify-center hover:bg-[#e4e7ec] transition-colors z-10 group"
      >
        {filterPanelOpen
          ? <ChevronLeft className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
          : <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
        }
      </button>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top context bar */}
        <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-2 z-10 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-900">Country Explorer</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500">England</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500">{selectedBrands.length} chains</span>
          {selectedRegion && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100">
                {selectedRegion}
                <button onClick={() => setSelectedRegion(null)} className="hover:text-blue-800 ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            </>
          )}
        </div>

        {/* Map + insights */}
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

      {/* ── Right region detail panel ── */}
      {selectedRegion && (
        <aside className="w-[272px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
          <RegionInfoPanel
            selectedRegion={selectedRegion}
            regionStats={regionStats}
            onClearRegion={() => setSelectedRegion(null)}
          />
        </aside>
      )}

    </div>
  );
};

export default Index;
