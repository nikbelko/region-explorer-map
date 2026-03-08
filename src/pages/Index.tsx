import { useState, useCallback } from "react";
import { GitCompare } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
        setSelectedBrands((prev) => prev.filter((b) => !brandsForCat.includes(b) || brandsStillNeeded.has(b)));
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
    <div className="flex h-full w-full overflow-hidden">
      {/* Map area */}
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

      {/* Right panel */}
      <aside className="w-[380px] min-w-[320px] border-l border-border bg-card flex flex-col">
        <header className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                Getplace
              </span>
            </div>
            <button
              onClick={() => navigate("/compare")}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <GitCompare className="w-3 h-3" />
              Compare
            </button>
          </div>
          <h1 className="text-lg font-bold text-foreground">Country Explorer</h1>
          <p className="text-xs text-muted-foreground">England • Competitive Intelligence</p>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <BrandFilters
            selectedBrands={selectedBrands}
            onToggleBrand={handleToggleBrand}
            onSelectAll={() => setSelectedBrands([...BRANDS])}
            onDeselectAll={() => setSelectedBrands([])}
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
          <RegionInfoPanel
            selectedRegion={selectedRegion}
            regionStats={regionStats}
            onClearRegion={() => setSelectedRegion(null)}
          />
        </div>
      </aside>
    </div>
  );
};

export default Index;
