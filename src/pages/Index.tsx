import { useState, useCallback } from "react";
import RegionMap from "@/components/RegionMap";
import BrandFilters from "@/components/BrandFilters";
import CategoryFilters, { Category, CATEGORIES, CATEGORY_BRAND_MAP } from "@/components/CategoryFilters";
import RegionInfoPanel from "@/components/RegionInfoPanel";
import InsightsPanel from "@/components/InsightsPanel";
import { Brand, BRANDS, RegionStats } from "@/data/regions";

const Index = () => {
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

      // Sync brands based on category
      const brandsForCat = CATEGORY_BRAND_MAP[cat];
      if (isRemoving) {
        // Remove brands that belong ONLY to this category (not to other active categories)
        const otherActiveCats = newCategories;
        const brandsStillNeeded = new Set(
          otherActiveCats.flatMap((c) => CATEGORY_BRAND_MAP[c])
        );
        setSelectedBrands((prev) =>
          prev.filter((b) => !brandsForCat.includes(b) || brandsStillNeeded.has(b))
        );
      } else {
        // Add brands for this category
        setSelectedBrands((prev) => [...new Set([...prev, ...brandsForCat])]);
      }

      return newCategories;
    });
  };

  const handleRegionStats = useCallback((stats: RegionStats | null) => {
    setRegionStats(stats);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-[30%] min-w-[280px] border-r border-border bg-card flex flex-col">
        <header className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Getplace
            </span>
          </div>
          <h1 className="text-lg font-bold text-foreground">Country Explorer</h1>
          <p className="text-xs text-muted-foreground">England • Competitive Intelligence</p>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <BrandFilters
            selectedBrands={selectedBrands}
            onToggleBrand={handleToggleBrand}
            onSelectAll={() => setSelectedBrands([...BRANDS])}
            onDeselectAll={() => setSelectedBrands([])}
          />
          <CategoryFilters
            selectedCategories={selectedCategories}
            onToggleCategory={handleToggleCategory}
          />
          <RegionInfoPanel selectedRegion={selectedRegion} regionStats={regionStats} onClearRegion={() => setSelectedRegion(null)} />
        </div>
      </aside>

      <main className="flex-1 relative">
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
      </main>
    </div>
  );
};

export default Index;
