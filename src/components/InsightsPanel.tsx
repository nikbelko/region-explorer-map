import { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { Brand, BRAND_COLOR_MAP, RegionStats } from "@/data/regions";
import { Category, CATEGORY_BRAND_MAP } from "@/components/CategoryFilters";

interface InsightsPanelProps {
  selectedRegion: string | null;
  regionStats: RegionStats | null;
  selectedBrands: Brand[];
  selectedCategories: Category[];
}

const InsightsPanel = ({ selectedRegion, regionStats, selectedBrands, selectedCategories }: InsightsPanelProps) => {
  const insights = useMemo(() => {
    if (!selectedRegion || !regionStats) return [];

    const result: string[] = [];

    // Per-brand insights from quarterly dynamics
    for (const b of regionStats.brands) {
      if (!selectedBrands.includes(b.brand)) continue;
      // Pseudo-random quarterly change per brand+region
      let hash = 0;
      const key = `${selectedRegion}:${b.brand}`;
      for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }
      const change = (Math.abs(hash) % 21) - 6; // range roughly -6 to +14

      if (change >= 0) {
        result.push(`В ${selectedRegion} бренд ${b.brand} открыл +${change} точек за квартал`);
      } else {
        result.push(`В ${selectedRegion} бренд ${b.brand} закрыл ${change} точек за квартал`);
      }
    }

    // Per-category insights
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
        result.push(`В ${selectedRegion} точки категории «${cat}» выросли на +${change} за квартал`);
      } else {
        result.push(`В ${selectedRegion} точки категории «${cat}» сократились на ${Math.abs(change)} за квартал`);
      }
    }

    return result;
  }, [selectedRegion, regionStats, selectedBrands, selectedCategories]);

  if (!selectedRegion) return null;

  return (
    <div className="absolute bottom-6 left-6 right-64 z-[1000] bg-card/80 backdrop-blur-md border border-border rounded-lg p-3 max-h-32 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Инсайты
        </h4>
      </div>
      {insights.length > 0 ? (
        <div className="space-y-1">
          {insights.map((text, i) => (
            <p key={i} className="text-xs text-foreground/80">
              • {text}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Нет данных для отображения инсайтов</p>
      )}
    </div>
  );
};

export default InsightsPanel;
