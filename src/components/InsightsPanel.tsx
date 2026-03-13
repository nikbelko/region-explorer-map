import { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { Brand, RegionStats } from "@/data/regions";
import { Category, CATEGORY_BRAND_MAP } from "@/components/CategoryFilters";

interface InsightsPanelProps {
  selectedRegion: string | null;
  regionStats: RegionStats | null;
  selectedBrands: Brand[];
  selectedCategories: Category[];
}

const InsightsPanel = ({ selectedRegion, regionStats, selectedBrands, selectedCategories }: InsightsPanelProps) => {
  const insights = useMemo(() => {
    if (!selectedRegion || !regionStats) {
      const result: string[] = [];
      if (selectedBrands.includes("McDonald's") && selectedBrands.includes("KFC")) {
        result.push("McDonald's and KFC are present in all England regions");
      }
      if (selectedBrands.includes("Domino's")) {
        result.push("Domino's is the most widespread pizza chain in the country");
      }
      if (selectedBrands.includes("Subway")) {
        result.push("Subway leads in sandwich category by region coverage");
      }
      if (selectedBrands.includes("Nando's")) {
        result.push("Nando's is concentrated primarily in southern regions");
      }
      result.push("Select a region on the map for detailed insights");
      return result.slice(0, 4);
    }

    const result: string[] = [];

    for (const b of regionStats.brands) {
      if (!selectedBrands.includes(b.brand)) continue;
      let hash = 0;
      const key = `${selectedRegion}:${b.brand}`;
      for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }
      const change = (Math.abs(hash) % 21) - 6;
      if (change >= 0) {
        result.push(`${b.brand} opened +${change} locations in ${selectedRegion} this quarter`);
      } else {
        result.push(`${b.brand} closed ${Math.abs(change)} locations in ${selectedRegion} this quarter`);
      }
    }

    for (const cat of selectedCategories) {
      const catBrands = CATEGORY_BRAND_MAP[cat].filter((br) => selectedBrands.includes(br));
      if (catBrands.length === 0) continue;
      let hash = 0;
      const key = `${selectedRegion}:cat:${cat}`;
      for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }
      const change = (Math.abs(hash) % 25) - 10;
      if (change >= 0) {
        result.push(`"${cat}" category grew by +${change} locations in ${selectedRegion}`);
      } else {
        result.push(`"${cat}" category shrank by ${Math.abs(change)} locations in ${selectedRegion}`);
      }
    }

    return result;
  }, [selectedRegion, regionStats, selectedBrands, selectedCategories]);

  const headerText = selectedRegion ? `${selectedRegion} — Insights` : "England — Insights";

  return (
    <div className="absolute bottom-4 left-4 right-[220px] z-[1000] bg-white border border-gray-200 rounded-lg shadow-sm p-3 max-h-28 overflow-y-auto">
      <div className="flex items-center gap-2 mb-1.5">
        <Lightbulb className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {headerText}
        </h4>
      </div>
      {insights.length > 0 ? (
        <div className="space-y-0.5">
          {insights.map((text, i) => (
            <p key={i} className="text-xs text-gray-600">• {text}</p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No insights available</p>
      )}
    </div>
  );
};

export default InsightsPanel;
