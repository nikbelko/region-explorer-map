import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitCompare, Map, BarChart2, List, Star, Settings, LogOut,
  Search, ChevronRight, X
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
        const otherActiveCats = newCategories;
        const brandsStillNeeded = new Set(otherActiveCats.flatMap((c) => CATEGORY_BRAND_MAP[c]));
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

      {/* Left icon navbar — Getplace style */}
      <nav className="w-12 flex-shrink-0 bg-[#1c1c1e] flex flex-col items-center py-3 gap-1 z-20">
        {/* Logo */}
        <div className="w-8 h-8 mb-3 flex items-center justify-center">
          <svg viewBox="0 0 107.57 137.26" className="w-5 h-5" fill="#9a9d9e">
            <path d="M77,60.2c17.98,6.17,31.89-14.53,21.26-30.29C89.01,16.2,73.41,7.2,55.72,7.2C27.33,7.2,4.31,30.4,4.31,59.03c0,33.56,38.08,63.1,48.7,70.68c1.65,1.18,3.78,1.18,5.43,0c5.79-4.13,19.74-14.8,31.24-29.08c8.85-11,3.92-26.29-8.16-33.59c-7.96-4.81-19.96-4.13-23.53,4.45c-1.76,4.23-1.72,8.9,2.87,13.5C71.27,95.39,40.3,98.85,40.3,74.58c0-19.82,21.52-22.05,28.92-17.89C71.88,58.18,74.48,59.33,77,60.2z" />
          </svg>
        </div>

        <button title="Map" className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2d2d2f] text-white">
          <Map className="w-4 h-4" />
        </button>
        <button title="Analytics" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d2d2f] transition-colors">
          <BarChart2 className="w-4 h-4" />
        </button>
        <button title="List" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d2d2f] transition-colors">
          <List className="w-4 h-4" />
        </button>
        <button title="Saved" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2d2d2f] transition-colors">
          <Star className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <button title="Settings" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button title="Logout" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </nav>

      {/* Filter sidebar */}
      <aside className="w-[260px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">

        {/* Breadcrumb + actions */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2.5">
            <span className="font-medium text-gray-700">Great Britain</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-gray-700">England</span>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white">
              Chains
            </span>
            <button
              onClick={() => navigate("/compare")}
              className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors flex items-center gap-1.5"
            >
              <GitCompare className="w-3 h-3" />
              Compare
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-200">
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

        {/* Filters */}
        <div className="flex-1 overflow-y-auto">
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
      </aside>

      {/* Main area */}
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

      {/* Right info panel — shown when region selected */}
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
