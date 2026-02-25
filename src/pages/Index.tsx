import { useState } from "react";
import RegionMap from "@/components/RegionMap";
import BrandFilters from "@/components/BrandFilters";
import RegionInfoPanel from "@/components/RegionInfoPanel";
import { Brand, BRANDS } from "@/data/regions";

const Index = () => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([...BRANDS]);

  const handleToggleBrand = (brand: Brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left Panel */}
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
          />
          <RegionInfoPanel selectedRegion={selectedRegion} />
        </div>
      </aside>

      {/* Right Panel - Map */}
      <main className="flex-1 relative">
        <RegionMap
          onRegionClick={setSelectedRegion}
          selectedRegion={selectedRegion}
        />
      </main>
    </div>
  );
};

export default Index;
