import { BRANDS, Brand } from "@/data/regions";

interface BrandFiltersProps {
  selectedBrands: Brand[];
  onToggleBrand: (brand: Brand) => void;
}

const brandColors: Record<Brand, string> = {
  "McDonald's": "hsl(45, 85%, 55%)",
  "KFC": "hsl(0, 72%, 55%)",
  "Burger King": "hsl(20, 80%, 55%)",
  "Subway": "hsl(130, 50%, 50%)",
  "Starbucks": "hsl(160, 55%, 50%)",
  "Dominos": "hsl(210, 70%, 55%)",
  "Pizza Hut": "hsl(340, 65%, 55%)",
};

const BrandFilters = ({ selectedBrands, onToggleBrand }: BrandFiltersProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Фильтры брендов
      </h3>
      {BRANDS.map((brand) => {
        const isSelected = selectedBrands.includes(brand);
        return (
          <label
            key={brand}
            className="flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
          >
            <div
              className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: isSelected ? brandColors[brand] : "hsl(220, 16%, 30%)",
                backgroundColor: isSelected ? brandColors[brand] : "transparent",
              }}
            >
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="hsl(220, 25%, 10%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-secondary-foreground group-hover:text-foreground transition-colors">
              {brand}
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default BrandFilters;
