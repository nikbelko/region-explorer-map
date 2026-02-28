import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { BRANDS, Brand, BRAND_COLOR_MAP } from "@/data/regions";

interface BrandFiltersProps {
  selectedBrands: Brand[];
  onToggleBrand: (brand: Brand) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const BrandFilters = ({ selectedBrands, onToggleBrand, onSelectAll, onDeselectAll }: BrandFiltersProps) => {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const filteredBrands = BRANDS.filter((brand) =>
    brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full group"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Фильтры брендов
        </h3>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>

      {!collapsed && (
        <>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск бренда..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {filteredBrands.map((brand) => {
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

          {filteredBrands.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-2 py-2">Ничего не найдено</p>
          )}

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
        </>
      )}
    </div>
  );
};

export default BrandFilters;
