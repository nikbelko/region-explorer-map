import { BRANDS, Brand, BRAND_COLOR_MAP } from "@/data/regions";

interface BrandFiltersProps {
  selectedBrands: Brand[];
  onToggleBrand: (brand: Brand) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const BrandFilters = ({ selectedBrands, onToggleBrand, onSelectAll, onDeselectAll }: BrandFiltersProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Фильтры брендов
      </h3>
      {BRANDS.map((brand) => {
        const isSelected = selectedBrands.includes(brand);
        const color = BRAND_COLOR_MAP[brand];
        return (
          <label
            key={brand}
            className="flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
          >
            <div
              className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: isSelected ? color : "hsl(220, 16%, 30%)",
                backgroundColor: isSelected ? color : "transparent",
              }}
            >
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="hsl(220, 25%, 10%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className="text-sm transition-colors"
              style={{ color: isSelected ? color : "hsl(210, 20%, 70%)" }}
            >
              {brand}
            </span>
          </label>
        );
      })}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onSelectAll}
          className="flex-1 text-xs py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          Выбрать все
        </button>
        <button
          onClick={onDeselectAll}
          className="flex-1 text-xs py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          Сбросить все
        </button>
      </div>
    </div>
  );
};

export default BrandFilters;
